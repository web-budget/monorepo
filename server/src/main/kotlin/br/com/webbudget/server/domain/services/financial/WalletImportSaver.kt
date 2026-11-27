package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportBlocker
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.domain.entities.financial.Transfer
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import br.com.webbudget.server.infrastructure.repository.financial.TransferRepository
import org.springframework.stereotype.Component

@Component
class WalletImportSaver(
    private val movementService: MovementService,
    private val movementRepository: MovementRepository,
    private val transferService: TransferService,
    private val transferRepository: TransferRepository
) : ImportSaver {

    override fun supports(import: Import): Boolean = !import.isCard

    override fun save(import: Import, lines: List<ImportLine>) {
        lines.forEach { line ->
            when (line.action) {
                ImportAction.CREATE -> create(import, line)
                ImportAction.LINK -> link(import, line)
                ImportAction.INVOICE_PAYMENT -> pay(import, line, findMovement(line))
                ImportAction.TRANSFER -> transfer(import, line)
                else -> Unit
            }
        }
    }

    override fun undo(import: Import, lines: List<ImportLine>) {
        lines.asReversed().forEach { line ->
            when (line.action) {
                ImportAction.CREATE -> undoCreate(line)
                ImportAction.LINK -> undoLink(line)
                ImportAction.INVOICE_PAYMENT -> movementService.undoPayment(findMovement(line))
                ImportAction.TRANSFER -> transferService.returnTransfer(transferRepository.findById(line.createdTransferId!!)!!)
                else -> Unit
            }
        }
    }

    override fun blockers(import: Import, lines: List<ImportLine>): List<ImportBlocker> = lines.mapNotNull { line ->

        val reason = when (line.action) {
            ImportAction.CREATE -> createBlocker(import, line)
            ImportAction.LINK, ImportAction.INVOICE_PAYMENT -> linkBlocker(import, line)
            ImportAction.TRANSFER -> transferBlocker(line)
            else -> null
        }

        reason?.let { ImportBlocker(it, line.position, line.name) }
    }

    private fun create(import: Import, line: ImportLine) {

        val movement = Movement(
            name = line.name,
            type = if (line.isCredit) Movement.Type.INCOME else Movement.Type.EXPENSE,
            value = line.absoluteValue,
            dueDate = line.postedOn,
            classification = line.classification!!,
            costCenter = line.costCenter!!,
            financialPeriod = import.financialPeriod
        )

        movementService.create(movement, payment(import, line))

        line.createdMovementId = movement.id
    }

    private fun link(import: Import, line: ImportLine) {

        if (line.link!!.kind == ImportCandidateKind.TRANSFER) {
            return
        }

        val movement = findMovement(line)

        if (movement.value.compareTo(line.absoluteValue) != 0) {
            line.previousValue = movement.value
            movement.value = line.absoluteValue
            movementService.update(movement)
        }

        pay(import, line, movement)
    }

    private fun pay(import: Import, line: ImportLine, movement: Movement) {
        movementService.pay(movement, payment(import, line))
    }

    private fun transfer(import: Import, line: ImportLine) {

        val transfer = Transfer(
            fromWallet = import.wallet!!,
            toWallet = line.targetWallet!!,
            value = line.absoluteValue,
            description = line.description
        )

        transferService.transfer(transfer)

        line.createdTransferId = transfer.id
    }

    private fun undoCreate(line: ImportLine) {

        val movement = movementService.undoPayment(movementRepository.findById(line.createdMovementId!!)!!)

        movementService.delete(movement)

        line.createdMovementId = null
    }

    private fun undoLink(line: ImportLine) {

        if (line.link!!.kind == ImportCandidateKind.TRANSFER) {
            return
        }

        val movement = movementService.undoPayment(findMovement(line))

        line.previousValue?.let {
            movement.value = it
            movementService.update(movement)
        }

        line.previousValue = null
    }

    private fun createBlocker(import: Import, line: ImportLine): String? {

        val movement = line.createdMovementId?.let { movementRepository.findById(it) }

        return CREATED_CHANGED.takeUnless { isPaidByWallet(movement, import) }
    }

    private fun linkBlocker(import: Import, line: ImportLine): String? {

        if (line.link?.kind == ImportCandidateKind.TRANSFER) {
            return null
        }

        val movement = line.link?.let { movementRepository.findByExternalId(it.externalId) }

        return when {
            !isPaidByWallet(movement, import) -> LINK_CHANGED
            !movement!!.financialPeriod.isOpen() -> LINKED_PERIOD_CLOSED
            else -> null
        }
    }

    private fun transferBlocker(line: ImportLine): String? {

        val transfer = line.createdTransferId?.let { transferRepository.findById(it) }

        return TRANSFER_CHANGED.takeIf { transfer == null || transfer.returned }
    }

    private fun isPaidByWallet(movement: Movement?, import: Import): Boolean =
        movement?.payment?.wallet?.id == import.wallet!!.id

    private fun findMovement(line: ImportLine): Movement = movementRepository.findByExternalId(line.link!!.externalId)!!

    private fun payment(import: Import, line: ImportLine) = Payment(wallet = import.wallet, paidOn = line.postedOn)

    companion object {
        const val CREATED_CHANGED = "created-movement-changed"
        const val LINK_CHANGED = "linked-entry-changed"
        const val LINKED_PERIOD_CLOSED = "linked-period-not-open"
        const val TRANSFER_CHANGED = "created-transfer-changed"
    }
}
