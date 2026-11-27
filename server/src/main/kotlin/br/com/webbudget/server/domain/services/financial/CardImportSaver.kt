package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.CardPurchase
import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportBlocker
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVOICE_NOT_OPEN
import br.com.webbudget.server.infrastructure.repository.financial.CardPurchaseRepository
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import br.com.webbudget.server.infrastructure.repository.financial.RecurringLaunchRepository
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import org.springframework.stereotype.Component
import java.math.BigDecimal

interface ImportSaver {

    fun supports(import: Import): Boolean

    fun save(import: Import, lines: List<ImportLine>)

    fun undo(import: Import, lines: List<ImportLine>)

    fun blockers(import: Import, lines: List<ImportLine>): List<ImportBlocker>
}

@Component
class CardImportSaver(
    private val cardPurchaseService: CardPurchaseService,
    private val cardPurchaseRepository: CardPurchaseRepository,
    private val movementService: MovementService,
    private val movementRepository: MovementRepository,
    private val recurringLaunchService: RecurringLaunchService,
    private val recurringLaunchRepository: RecurringLaunchRepository,
    private val recurringMovementService: RecurringMovementService,
    private val recurringMovementRepository: RecurringMovementRepository,
    private val invoiceRepository: InvoiceRepository
) : ImportSaver {

    override fun supports(import: Import): Boolean = import.isCard

    override fun save(import: Import, lines: List<ImportLine>) {
        lines.forEach { line ->
            when (line.action) {
                ImportAction.CREATE -> create(import, line)
                ImportAction.LINK -> link(import, line)
                ImportAction.LAUNCH_RECURRING -> launch(import, line, recurringMovementRepository.findByExternalId(line.link!!.externalId)!!)
                ImportAction.CREATE_RECURRING -> createRecurring(import, line)
                else -> Unit
            }
        }
    }

    override fun undo(import: Import, lines: List<ImportLine>) {
        lines.asReversed().forEach { line ->
            when (line.action) {
                ImportAction.CREATE -> undoCreate(line)
                ImportAction.LINK -> undoLink(line)
                ImportAction.LAUNCH_RECURRING, ImportAction.CREATE_RECURRING -> undoLaunch(line)
                else -> Unit
            }
        }
    }

    override fun blockers(import: Import, lines: List<ImportLine>): List<ImportBlocker> {

        val invoice = invoiceRepository.findByCardAndFinancialPeriod(import.card!!.id, import.financialPeriod.id)

        val invoiceBlockers = if (invoice?.isOpen() == true) emptyList() else listOf(ImportBlocker(INVOICE_NOT_OPEN))

        return invoiceBlockers + lines.mapNotNull { line -> lineBlocker(import, line) }
    }

    private fun create(import: Import, line: ImportLine) {

        val purchase = CardPurchase(
            name = line.name,
            purchasedOn = line.postedOn,
            value = line.absoluteValue,
            classification = line.classification!!,
            costCenter = line.costCenter!!,
            card = import.card!!,
            financialPeriod = import.financialPeriod
        )

        cardPurchaseService.create(purchase)

        line.createdPurchaseId = purchase.id
    }

    private fun link(import: Import, line: ImportLine) {

        val link = line.link!!

        if (link.kind == ImportCandidateKind.PURCHASE) {

            val purchase = cardPurchaseRepository.findByExternalId(link.externalId)!!

            line.previousValue = previousValue(purchase.value, line)

            if (line.previousValue != null) {
                purchase.value = line.absoluteValue
                cardPurchaseService.update(purchase)
            }

            return
        }

        val movement = movementRepository.findByExternalId(link.externalId)!!

        line.previousValue = previousValue(movement.value, line)

        adjustValue(movement, line)
        pay(import, line, movement)
    }

    private fun createRecurring(import: Import, line: ImportLine) {

        val recurring = RecurringMovement(
            name = line.name,
            type = Movement.Type.EXPENSE,
            valueKind = RecurringMovement.ValueKind.FIXED,
            value = line.absoluteValue,
            installments = line.installments,
            firstInstallment = line.installment!!,
            autoLaunch = true,
            active = true,
            classification = line.classification!!,
            costCenter = line.costCenter!!,
            card = import.card
        )

        recurringMovementService.create(recurring)

        line.createdRecurringId = recurring.id

        launch(import, line, recurring)
    }

    private fun launch(import: Import, line: ImportLine, recurring: RecurringMovement) {

        val movement = recurringLaunchService.launchExtra(recurring, import.financialPeriod, 1, null).launched.single().movement

        line.createdMovementId = movement.id

        adjustValue(movement, line)
        pay(import, line, movement)
    }

    private fun pay(import: Import, line: ImportLine, movement: Movement) {
        movementService.pay(movement, Payment(wallet = null, paidOn = line.postedOn, card = import.card))
    }

    private fun adjustValue(movement: Movement, line: ImportLine) {

        if (movement.value.compareTo(line.absoluteValue) != 0) {
            movement.value = line.absoluteValue
            movementService.update(movement)
        }
    }

    private fun previousValue(current: BigDecimal, line: ImportLine): BigDecimal? =
        current.takeIf { it.compareTo(line.absoluteValue) != 0 }

    private fun undoCreate(line: ImportLine) {

        cardPurchaseService.delete(cardPurchaseRepository.findById(line.createdPurchaseId!!)!!)

        line.createdPurchaseId = null
    }

    private fun undoLink(line: ImportLine) {

        val link = line.link!!

        if (link.kind == ImportCandidateKind.PURCHASE) {

            val purchase = cardPurchaseRepository.findByExternalId(link.externalId)!!

            line.previousValue?.let {
                purchase.value = it
                cardPurchaseService.update(purchase)
            }
        } else {

            val movement = movementService.undoPayment(movementRepository.findByExternalId(link.externalId)!!)

            line.previousValue?.let {
                movement.value = it
                movementService.update(movement)
            }
        }

        line.previousValue = null
    }

    private fun undoLaunch(line: ImportLine) {

        val movement = movementService.undoPayment(movementRepository.findById(line.createdMovementId!!)!!)

        movementService.delete(movement)

        line.createdMovementId = null

        line.createdRecurringId?.let { recurringId ->
            recurringMovementService.delete(recurringMovementRepository.findByIds(listOf(recurringId)).single())
            line.createdRecurringId = null
        }
    }

    private fun lineBlocker(import: Import, line: ImportLine): ImportBlocker? {

        val reason = when (line.action) {
            ImportAction.CREATE -> createBlocker(line)
            ImportAction.LINK -> linkBlocker(import, line)
            ImportAction.LAUNCH_RECURRING, ImportAction.CREATE_RECURRING -> launchBlocker(import, line)
            else -> null
        }

        return reason?.let { ImportBlocker(it, line.position, line.name) }
    }

    private fun createBlocker(line: ImportLine): String? {

        val purchase = line.createdPurchaseId?.let { cardPurchaseRepository.findById(it) }

        return PURCHASE_CHANGED.takeUnless {
            purchase?.value?.compareTo(line.absoluteValue) == 0 && purchase.name == line.name
        }
    }

    private fun linkBlocker(import: Import, line: ImportLine): String? {

        val link = line.link

        val changed = if (link?.kind == ImportCandidateKind.PURCHASE) {
            cardPurchaseRepository.findByExternalId(link.externalId)?.value?.compareTo(line.absoluteValue) != 0
        } else {
            !isPaidOnCard(link?.let { movementRepository.findByExternalId(it.externalId) }, import)
        }

        return LINK_CHANGED.takeIf { changed }
    }

    private fun launchBlocker(import: Import, line: ImportLine): String? {

        val movement = line.createdMovementId?.let { movementRepository.findById(it) }
        val launches = line.createdRecurringId?.let { recurringLaunchRepository.countByRecurringMovement(it) } ?: 1

        return when {
            !isPaidOnCard(movement, import) -> LAUNCH_CHANGED
            launches != 1 -> RECURRING_LAUNCHED_ELSEWHERE
            else -> null
        }
    }

    private fun isPaidOnCard(movement: Movement?, import: Import): Boolean =
        movement?.payment?.card?.id == import.card!!.id

    companion object {
        const val PURCHASE_CHANGED = "created-purchase-changed"
        const val LINK_CHANGED = "linked-entry-changed"
        const val LAUNCH_CHANGED = "launched-movement-changed"
        const val RECURRING_LAUNCHED_ELSEWHERE = "recurring-launched-elsewhere"
    }
}
