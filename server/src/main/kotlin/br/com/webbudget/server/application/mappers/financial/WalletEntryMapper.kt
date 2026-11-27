package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.ReconciliationForm
import br.com.webbudget.server.application.payloads.financial.ReconciliationResultView
import br.com.webbudget.server.application.payloads.financial.ReconciliationView
import br.com.webbudget.server.application.payloads.financial.StatementEntryPeriodView
import br.com.webbudget.server.application.payloads.financial.StatementEntryReferenceView
import br.com.webbudget.server.application.payloads.financial.StatementEntryWalletView
import br.com.webbudget.server.application.payloads.financial.StatementSummaryView
import br.com.webbudget.server.application.payloads.financial.StatementTotalView
import br.com.webbudget.server.application.payloads.financial.TransferForm
import br.com.webbudget.server.application.payloads.financial.TransferReferenceView
import br.com.webbudget.server.application.payloads.financial.TransferView
import br.com.webbudget.server.application.payloads.financial.TransferWalletView
import br.com.webbudget.server.application.payloads.financial.WalletEntryView
import br.com.webbudget.server.domain.entities.financial.StatementLine
import br.com.webbudget.server.domain.entities.financial.StatementSummary
import br.com.webbudget.server.domain.entities.financial.Transfer
import br.com.webbudget.server.domain.entities.financial.TransferLink
import br.com.webbudget.server.domain.entities.financial.ReconciliationLine
import br.com.webbudget.server.domain.entities.financial.ReconciliationResult
import br.com.webbudget.server.domain.entities.financial.WalletReconciliation
import br.com.webbudget.server.domain.entities.financial.WalletEntry
import br.com.webbudget.server.domain.entities.financial.WalletReference
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import org.springframework.stereotype.Component
import java.math.RoundingMode

@Component
class WalletEntryMapper(
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun mapToView(line: StatementLine): WalletEntryView = WalletEntryView(
        id = line.externalId,
        createdOn = line.createdOn,
        name = line.name,
        direction = line.direction.name,
        origin = line.origin.name,
        value = line.value,
        previousBalance = line.previousBalance,
        resultingBalance = line.resultingBalance,
        financialPeriod = line.financialPeriod?.let { StatementEntryPeriodView(it.externalId, it.name) },
        reference = mapToReference(line)
    )

    fun mapToDetailView(line: StatementLine, wallet: WalletReference): WalletEntryView =
        mapToView(line).copy(
            wallet = StatementEntryWalletView(wallet.externalId, wallet.name),
            reconciliation = line.reconciliation?.let { mapToView(it) }
        )

    fun mapToView(summary: StatementSummary): StatementSummaryView = StatementSummaryView(
        credits = StatementTotalView(summary.credits.total, summary.credits.count),
        debits = StatementTotalView(summary.debits.total, summary.debits.count),
        lastEntryOn = summary.lastEntryOn
    )

    fun mapToView(entry: WalletEntry): WalletEntryView = WalletEntryView(
        id = entry.externalId!!,
        createdOn = entry.createdOn!!,
        name = entry.name,
        direction = entry.direction.name,
        origin = entry.origin.name,
        value = entry.value,
        previousBalance = entry.previousBalance,
        resultingBalance = entry.resultingBalance,
        financialPeriod = null,
        reference = null
    )

    fun mapToDomain(form: ReconciliationForm, wallet: WalletReference): WalletReconciliation = WalletReconciliation(
        wallet = wallet,
        informedBalance = form.informedBalance!!.setScale(BALANCE_SCALE, RoundingMode.HALF_UP),
        shownBalance = form.shownBalance!!.setScale(BALANCE_SCALE, RoundingMode.HALF_UP),
        reason = form.reason.orEmpty().trim()
    )

    fun mapToView(line: ReconciliationLine): ReconciliationView = ReconciliationView(
        id = line.externalId,
        createdOn = line.createdOn,
        informedBalance = line.informedBalance,
        walletBalance = line.walletBalance,
        difference = line.difference,
        reason = line.reason,
        entryId = line.entryExternalId
    )

    fun mapToView(result: ReconciliationResult): ReconciliationResultView = ReconciliationResultView(
        reconciliation = mapToView(result.reconciliation),
        entry = mapToView(result.entry).copy(
            reference = StatementEntryReferenceView(RECONCILIATION_REFERENCE, result.reconciliation.externalId)
        )
    )

    fun mapToDomain(form: TransferForm): Transfer = Transfer(
        fromWallet = movementReferenceRepository.findWallet(form.fromWallet!!) ?: throw ResourceNotFoundException(),
        toWallet = movementReferenceRepository.findWallet(form.toWallet!!) ?: throw ResourceNotFoundException(),
        value = form.value!!,
        description = form.description
    )

    fun mapToView(transfer: Transfer): TransferView = TransferView(
        id = transfer.externalId!!,
        createdOn = transfer.createdOn!!,
        value = transfer.value,
        description = transfer.description,
        fromWallet = TransferWalletView(transfer.fromWallet.externalId, transfer.fromWallet.name),
        toWallet = TransferWalletView(transfer.toWallet.externalId, transfer.toWallet.name),
        returnedTransfer = transfer.returnedTransferExternalId,
        returned = transfer.returned,
        returnOf = transfer.returnedTransferExternalId?.let { TransferReferenceView(it, transfer.returnedTransferCreatedOn!!) },
        returnedBy = transfer.returnedBy?.toView(),
        returnable = transfer.returnable
    )

    private fun TransferLink.toView() = TransferReferenceView(externalId, createdOn)

    private fun mapToReference(line: StatementLine): StatementEntryReferenceView? = when {
        line.movementExternalId != null -> StatementEntryReferenceView("MOVEMENT", line.movementExternalId)
        line.transferExternalId != null -> StatementEntryReferenceView(
            "TRANSFER",
            line.transferExternalId,
            returnTransfer = line.transferIsReturn,
            returnable = line.transferReturnable
        )
        line.reconciliation != null -> StatementEntryReferenceView(RECONCILIATION_REFERENCE, line.reconciliation.externalId)
        else -> null
    }

    companion object {

        private const val BALANCE_SCALE = 2

        private const val RECONCILIATION_REFERENCE = "RECONCILIATION"
    }
}
