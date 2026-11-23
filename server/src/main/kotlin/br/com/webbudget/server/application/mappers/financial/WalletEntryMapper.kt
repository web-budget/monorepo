package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.AdjustmentForm
import br.com.webbudget.server.application.payloads.financial.StatementEntryPeriodView
import br.com.webbudget.server.application.payloads.financial.StatementEntryReferenceView
import br.com.webbudget.server.application.payloads.financial.TransferForm
import br.com.webbudget.server.application.payloads.financial.TransferReferenceView
import br.com.webbudget.server.application.payloads.financial.TransferView
import br.com.webbudget.server.application.payloads.financial.TransferWalletView
import br.com.webbudget.server.application.payloads.financial.WalletEntryView
import br.com.webbudget.server.domain.entities.financial.StatementLine
import br.com.webbudget.server.domain.entities.financial.Transfer
import br.com.webbudget.server.domain.entities.financial.TransferLink
import br.com.webbudget.server.domain.entities.financial.WalletAdjustment
import br.com.webbudget.server.domain.entities.financial.WalletEntry
import br.com.webbudget.server.domain.entities.financial.WalletReference
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import org.springframework.stereotype.Component

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

    fun mapToDomain(form: AdjustmentForm, wallet: WalletReference): WalletAdjustment =
        WalletAdjustment(wallet, form.value!!, form.name!!)

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
        line.transferExternalId != null -> StatementEntryReferenceView("TRANSFER", line.transferExternalId)
        else -> null
    }
}
