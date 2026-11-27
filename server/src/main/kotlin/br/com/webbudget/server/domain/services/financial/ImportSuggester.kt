package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportCandidate
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.ImportNameMemory
import br.com.webbudget.server.domain.entities.financial.ImportSuggestionContext
import br.com.webbudget.server.domain.entities.financial.ImportedLine
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.OfxTransaction
import br.com.webbudget.server.domain.entities.financial.OfxTransactionKind
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.abs

@Component
class ImportSuggester {

    fun suggest(import: Import, transactions: List<OfxTransaction>, context: ImportSuggestionContext): List<ImportLine> {

        val state = State(import, context)
        val pairedFees = pairedFees(transactions)

        return transactions.mapIndexed { index, transaction ->

            val line = ImportLine(
                import = import,
                position = index + 1,
                postedOn = transaction.postedOn,
                value = transaction.amount,
                fitId = transaction.fitId,
                description = transaction.memo,
                name = transaction.name,
                installment = transaction.installment,
                installments = transaction.installments,
                kind = transaction.kind
            )

            suggestLine(line, pairedFees[index]?.let { transactions[it].postedOn }, state)

            line.refreshDifferentValue()

            line
        }
    }

    private fun suggestLine(line: ImportLine, pairedFeeDate: LocalDate?, state: State) {

        val rules: List<(ImportLine) -> Boolean> = if (state.import.isCard) {
            listOf(
                { current -> ignoreCardLine(current, pairedFeeDate) },
                { current -> linkRecurringLaunch(current, state) },
                { current -> linkByMemory(current, state) },
                { current -> launchRecurring(current, state) },
                { current -> createRecurring(current, state) }
            )
        } else {
            listOf(
                { current -> invoicePayment(current, state) },
                { current -> linkByMemory(current, state) },
                { current -> registeredTransfer(current, state) },
                { current -> transferByMemory(current, state) }
            )
        }

        val importedBefore = importedBefore(line, state)

        if (importedBefore != null) {
            line.action = ImportAction.IGNORE
            line.alreadyImported = true
            line.ignoreReason = ImportLine.ALREADY_IMPORTED
            line.ignoreReasonOn = importedBefore.importedOn
            return
        }

        if (rules.none { rule -> rule(line) }) {
            createWithMemory(line, state)
        }
    }

    private fun ignoreCardLine(line: ImportLine, pairedFeeDate: LocalDate?): Boolean {

        val reason = when {
            line.kind == OfxTransactionKind.PAYMENT_RECEIVED -> ImportLine.PAYMENT_RECEIVED
            pairedFeeDate != null -> ImportLine.IOF_PAIR
            line.isCredit -> ImportLine.CREDIT
            else -> return false
        }

        line.action = ImportAction.IGNORE
        line.ignoreReason = reason
        line.ignoreReasonOn = pairedFeeDate

        return true
    }

    private fun importedBefore(line: ImportLine, state: State): ImportedLine? = state.context.importedBefore.firstOrNull { before ->
        val sameIdentity = before.fitId == line.fitId &&
            before.value.compareTo(line.value) == 0 &&
            before.description == line.description
        val sameCardLine = state.import.isCard &&
            before.postedOn == line.postedOn &&
            before.value.compareTo(line.value) == 0 &&
            ImportNameMemory.normalize(before.name) == ImportNameMemory.normalize(line.name)
        sameIdentity || sameCardLine
    }

    private fun linkRecurringLaunch(line: ImportLine, state: State): Boolean {

        val card = state.import.card!!

        val candidate = state.context.movements.firstOrNull { movement ->
            state.isFree(movement) &&
                movement.recurringCardId == card.id &&
                sameValue(movement, line) &&
                if (line.installment != null) {
                    movement.installment == line.installment && movement.installments == line.installments
                } else {
                    movement.installments == null && sameName(movement, line)
                }
        } ?: return false

        link(line, candidate, state)

        return true
    }

    private fun linkByMemory(line: ImportLine, state: State): Boolean {

        val memory = state.context.memories[ImportNameMemory.normalize(line.name)]
            ?.takeIf { it.action == ImportAction.LINK }
            ?: return false

        val movementType = if (line.isCredit) Movement.Type.INCOME else Movement.Type.EXPENSE

        val candidate = memory.recurringId?.let { recurringId ->
            state.context.movements.firstOrNull { movement ->
                state.isFree(movement) &&
                    movement.recurringId == recurringId &&
                    movement.movementType == movementType &&
                    sameValue(movement, line)
            }
        } ?: state.context.purchases.firstOrNull { purchase ->
            state.isFree(purchase) && sameValue(purchase, line) && sameName(purchase, line)
        } ?: return false

        link(line, candidate, state)
        line.fromMemory = true

        return true
    }

    private fun launchRecurring(line: ImportLine, state: State): Boolean {

        val candidate = state.context.recurringMovements.firstOrNull { recurring ->
            line.installment != null &&
                state.isFree(recurring) &&
                sameValue(recurring, line) &&
                recurring.installments == line.installments &&
                recurring.installment == line.installment
        } ?: return false

        line.action = ImportAction.LAUNCH_RECURRING
        line.link = candidate
        state.use(candidate)

        return true
    }

    private fun createRecurring(line: ImportLine, state: State): Boolean {

        if (line.installment == null) {
            return false
        }

        line.action = ImportAction.CREATE_RECURRING
        applyMemory(line, state.context.memories[ImportNameMemory.normalize(line.name)])

        return true
    }

    private fun invoicePayment(line: ImportLine, state: State): Boolean {

        val candidates = state.context.invoicePayments.filter { state.isFree(it) }

        if (line.kind != OfxTransactionKind.INVOICE_PAYMENT || line.isCredit || candidates.isEmpty()) {
            return false
        }

        line.action = ImportAction.INVOICE_PAYMENT
        line.link = candidates.firstOrNull { sameValue(it, line) }?.also { state.use(it) }

        return true
    }

    private fun registeredTransfer(line: ImportLine, state: State): Boolean {

        val walletId = state.import.wallet!!.id

        val candidate = state.context.transfers.firstOrNull { transfer ->
            state.isFree(transfer) &&
                sameValue(transfer, line) &&
                (if (line.isCredit) transfer.toWalletId else transfer.fromWalletId) == walletId &&
                abs(ChronoUnit.DAYS.between(transfer.date!!, line.postedOn)) <= TRANSFER_DATE_TOLERANCE_DAYS
        } ?: return false

        line.alreadyRegistered = true

        if (line.isCredit) {
            line.action = ImportAction.IGNORE
            line.ignoreReason = ImportLine.ALREADY_REGISTERED
            state.use(candidate)
        } else {
            link(line, candidate, state)
        }

        return true
    }

    private fun transferByMemory(line: ImportLine, state: State): Boolean {

        val memory = state.context.memories[ImportNameMemory.normalize(line.name)] ?: return false

        val wallet = memory.wallet

        val transfer = memory.action == ImportAction.TRANSFER &&
            !line.isCredit &&
            wallet != null &&
            wallet.active &&
            wallet.id != state.import.wallet!!.id

        if (transfer) {
            line.action = ImportAction.TRANSFER
            line.targetWallet = wallet
            line.fromMemory = true
        }

        return transfer || ignoreByMemory(line, memory)
    }

    private fun ignoreByMemory(line: ImportLine, memory: ImportNameMemory): Boolean {

        val ignore = memory.action == ImportAction.IGNORE

        if (ignore) {
            line.action = ImportAction.IGNORE
            line.fromMemory = true
        }

        return ignore
    }

    private fun createWithMemory(line: ImportLine, state: State) {

        line.action = ImportAction.CREATE

        applyMemory(line, state.context.memories[ImportNameMemory.normalize(line.name)])
    }

    private fun applyMemory(line: ImportLine, memory: ImportNameMemory?) {

        if (memory == null) {
            return
        }

        val classificationType = if (line.isCredit) Movement.Type.INCOME.name else Movement.Type.EXPENSE.name

        line.fromMemory = true
        line.costCenter = memory.costCenter
        line.classification = memory.classification?.takeIf { it.type == classificationType }
    }

    private fun link(line: ImportLine, candidate: ImportCandidate, state: State) {

        line.action = ImportAction.LINK
        line.link = candidate
        state.use(candidate)
    }

    private fun sameValue(candidate: ImportCandidate, line: ImportLine): Boolean =
        candidate.value.compareTo(line.absoluteValue) == 0

    private fun sameName(candidate: ImportCandidate, line: ImportLine): Boolean =
        ImportNameMemory.normalize(candidate.name) == ImportNameMemory.normalize(line.name)

    private fun pairedFees(transactions: List<OfxTransaction>): Map<Int, Int> {

        val refunds = transactions.withIndex()
            .filter { it.value.kind == OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE_REFUND }
            .toMutableList()

        val paired = mutableMapOf<Int, Int>()

        transactions.withIndex()
            .filter { it.value.kind == OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE }
            .forEach { fee ->
                val refund = refunds.firstOrNull { sameAmount(it.value.amount, fee.value.amount) }
                if (refund != null) {
                    refunds.remove(refund)
                    paired[fee.index] = refund.index
                    paired[refund.index] = fee.index
                }
            }

        return paired
    }

    private fun sameAmount(first: BigDecimal, second: BigDecimal): Boolean = first.abs().compareTo(second.abs()) == 0

    private class State(
        val import: Import,
        val context: ImportSuggestionContext
    ) {

        private val used = mutableSetOf<Pair<ImportCandidateKind, Long>>()

        fun isFree(candidate: ImportCandidate): Boolean = (candidate.kind to candidate.id) !in used

        fun use(candidate: ImportCandidate) {
            used.add(candidate.kind to candidate.id)
        }
    }

    companion object {
        private const val TRANSFER_DATE_TOLERANCE_DAYS = 3L
    }
}
