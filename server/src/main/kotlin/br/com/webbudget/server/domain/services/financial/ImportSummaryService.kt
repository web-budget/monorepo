package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportCandidate
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.ImportSummary
import br.com.webbudget.server.domain.entities.financial.ImportTotals
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.OfxTransactionKind
import br.com.webbudget.server.infrastructure.repository.financial.ImportCandidateRepository
import br.com.webbudget.server.infrastructure.repository.financial.ImportLineRepository
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
@Transactional(readOnly = true)
class ImportSummaryService(
    private val importSaveService: ImportSaveService,
    private val importLineRepository: ImportLineRepository,
    private val importCandidateRepository: ImportCandidateRepository,
    private val invoiceRepository: InvoiceRepository,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun summarize(import: Import): ImportSummary {

        val totals = importLineRepository.totals(import.id!!)

        if (import.status != Import.Status.READY) {
            return ImportSummary(
                totals,
                importSaveService.undoBlockers(import),
                emptyList(),
                null,
                BigDecimal.ZERO,
                import.ledgerBalance,
                null,
                BigDecimal.ZERO,
                null,
                import.wallet?.let { movementReferenceRepository.findWalletBalances(it.id).compartments.size } ?: 0
            )
        }

        val lines = importLineRepository.findAll(import)

        return if (import.isCard) summarizeCard(import, totals, lines) else summarizeWallet(import, totals, lines)
    }

    private fun summarizeCard(import: Import, totals: ImportTotals, lines: List<ImportLine>): ImportSummary {

        val card = import.card!!
        val invoice = invoiceRepository.findByCardAndFinancialPeriod(card.id, import.financialPeriod.id)!!

        val fileTotal = lines.filter { it.kind != OfxTransactionKind.PAYMENT_RECEIVED }
            .fold(BigDecimal.ZERO) { total, line -> total.subtract(line.value) }

        val ignoredCredits = lines.filter { it.action == ImportAction.IGNORE && it.isCredit && it.kind != OfxTransactionKind.PAYMENT_RECEIVED }
            .fold(BigDecimal.ZERO) { total, line -> total.add(line.value) }

        val afterSave = lines.fold(invoice.value) { total, line -> total.add(invoiceEffect(line)) }

        val unlinked = importCandidateRepository.findOpenMovements(import.financialPeriod.id, Movement.Type.EXPENSE)
            .filter { it.recurringId != null && it.recurringCardId == card.id }

        return ImportSummary(
            totals = totals,
            undoBlockers = emptyList(),
            unlinkedRecurring = unlinked.notIn(lines),
            fileTotal = fileTotal,
            afterSave = afterSave,
            ledgerBalance = import.ledgerBalance,
            currentBalance = null,
            ignoredCredits = ignoredCredits
        )
    }

    private fun summarizeWallet(import: Import, totals: ImportTotals, lines: List<ImportLine>): ImportSummary {

        val wallet = import.wallet!!

        val balances = movementReferenceRepository.findWalletBalances(wallet.id)

        val afterSave = lines.fold(wallet.currentBalance) { total, line -> total.add(walletEffect(line)) }

        val totalAfterSave = lines
            .filter { it.action != ImportAction.COMPARTMENT }
            .fold(balances.totalBalance) { total, line -> total.add(walletEffect(line)) }

        val unlinked = (
            importCandidateRepository.findOpenMovements(import.financialPeriod.id, Movement.Type.INCOME) +
                importCandidateRepository.findOpenMovements(import.financialPeriod.id, Movement.Type.EXPENSE)
            ).filter { it.recurringId != null && it.recurringCardId == null }

        return ImportSummary(
            totals = totals,
            undoBlockers = emptyList(),
            unlinkedRecurring = unlinked.notIn(lines),
            fileTotal = null,
            afterSave = afterSave,
            ledgerBalance = import.ledgerBalance,
            currentBalance = wallet.currentBalance,
            ignoredCredits = BigDecimal.ZERO,
            totalAfterSave = totalAfterSave,
            compartmentCount = balances.compartments.size
        )
    }

    private fun invoiceEffect(line: ImportLine): BigDecimal = when (line.action) {
        ImportAction.CREATE, ImportAction.CREATE_RECURRING, ImportAction.LAUNCH_RECURRING -> line.absoluteValue
        ImportAction.LINK -> line.link?.let { link ->
            if (link.kind == ImportCandidateKind.PURCHASE) line.absoluteValue.subtract(link.value) else line.absoluteValue
        } ?: BigDecimal.ZERO

        else -> BigDecimal.ZERO
    }

    private fun walletEffect(line: ImportLine): BigDecimal = when (line.action) {
        ImportAction.CREATE, ImportAction.INVOICE_PAYMENT, ImportAction.TRANSFER, ImportAction.COMPARTMENT -> line.value
        ImportAction.LINK -> if (line.link?.kind == ImportCandidateKind.MOVEMENT) line.value else BigDecimal.ZERO
        else -> BigDecimal.ZERO
    }

    private fun List<ImportCandidate>.notIn(lines: List<ImportLine>): List<ImportCandidate> {

        val linked = lines.mapNotNull { it.link }.map { it.kind to it.id }.toSet()

        return filter { (it.kind to it.id) !in linked }
    }
}
