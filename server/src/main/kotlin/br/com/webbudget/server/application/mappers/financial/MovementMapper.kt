package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.MovementClassificationView
import br.com.webbudget.server.application.payloads.financial.MovementCostCenterView
import br.com.webbudget.server.application.payloads.financial.MovementCreateForm
import br.com.webbudget.server.application.payloads.financial.MovementFinancialPeriodView
import br.com.webbudget.server.application.payloads.financial.MovementInvoiceView
import br.com.webbudget.server.application.payloads.financial.MovementListView
import br.com.webbudget.server.application.payloads.financial.MovementRecurringView
import br.com.webbudget.server.application.payloads.financial.MovementUpdateForm
import br.com.webbudget.server.application.payloads.financial.MovementView
import br.com.webbudget.server.application.payloads.financial.PaymentCardView
import br.com.webbudget.server.application.payloads.financial.PaymentForm
import br.com.webbudget.server.application.payloads.financial.PaymentView
import br.com.webbudget.server.application.payloads.financial.PaymentWalletView
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDate

@Component
class MovementMapper(
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun mapToView(movement: Movement): MovementView {

        val today = LocalDate.now()

        return MovementView(
            id = movement.externalId!!,
            name = movement.name,
            type = movement.type.name,
            value = movement.value,
            dueDate = movement.dueDate,
            status = movement.status.name,
            overdue = movement.isOverdue(today),
            classification = movement.classification?.let {
                MovementClassificationView(it.externalId, it.name, it.type)
            },
            costCenter = movement.costCenter?.let { MovementCostCenterView(it.externalId, it.name, it.fullName) },
            financialPeriod = mapToPeriodView(movement.financialPeriod, today),
            description = movement.description,
            payment = movement.payment?.let { mapToPaymentView(it) },
            invoice = movement.invoice?.let {
                MovementInvoiceView(it.externalId!!, it.status.name, PaymentCardView(it.card.externalId, it.card.name, it.card.lastFourDigits))
            },
            recurringMovement = movement.recurringMovement?.let {
                MovementRecurringView(it.externalId, it.name, it.card?.let { card -> PaymentCardView(card.externalId, card.name, card.lastFourDigits) })
            }
        )
    }

    fun mapToListView(movement: Movement): MovementListView {

        val today = LocalDate.now()

        return MovementListView(
            id = movement.externalId!!,
            name = movement.name,
            type = movement.type.name,
            value = movement.value,
            dueDate = movement.dueDate,
            status = movement.status.name,
            overdue = movement.isOverdue(today),
            financialPeriod = mapToPeriodView(movement.financialPeriod, today)
        )
    }

    fun mapToDomain(form: MovementCreateForm): Movement = Movement(
        name = form.name!!,
        type = form.type!!,
        value = form.value!!,
        dueDate = form.dueDate ?: LocalDate.now(),
        classification = movementReferenceRepository.findClassification(form.classification!!)
            ?: throw ResourceNotFoundException(),
        costCenter = movementReferenceRepository.findCostCenter(form.costCenter!!)
            ?: throw ResourceNotFoundException(),
        financialPeriod = movementReferenceRepository.findFinancialPeriod(form.financialPeriod!!)
            ?: throw ResourceNotFoundException(),
        description = form.description
    )

    fun mapToDomain(form: MovementUpdateForm, movement: Movement): Movement = movement.apply {
        this.name = form.name!!
        this.value = form.value!!
        this.dueDate = form.dueDate ?: this.dueDate
        this.classification = movementReferenceRepository.findClassification(form.classification!!)
            ?: throw ResourceNotFoundException()
        this.costCenter = movementReferenceRepository.findCostCenter(form.costCenter!!)
            ?: throw ResourceNotFoundException()
        this.description = form.description
    }

    fun mapToDomain(form: PaymentForm): Payment = Payment(
        wallet = form.wallet?.let { movementReferenceRepository.findWallet(it) ?: throw ResourceNotFoundException() },
        paidOn = form.paidOn ?: LocalDate.now(),
        discount = form.discount ?: BigDecimal.ZERO,
        card = form.card?.let { movementReferenceRepository.findCard(it) ?: throw ResourceNotFoundException() }
    )

    private fun mapToPeriodView(period: FinancialPeriodReference, today: LocalDate) = MovementFinancialPeriodView(
        id = period.externalId,
        name = period.name,
        status = period.status.name,
        expired = period.isExpired(today)
    )

    private fun mapToPaymentView(payment: Payment) = PaymentView(
        paidOn = payment.paidOn,
        value = payment.value,
        discount = payment.discount,
        valuePaid = payment.valuePaid,
        wallet = payment.wallet?.let { PaymentWalletView(it.externalId, it.name) },
        card = payment.card?.let { PaymentCardView(it.externalId, it.name, it.lastFourDigits) }
    )
}
