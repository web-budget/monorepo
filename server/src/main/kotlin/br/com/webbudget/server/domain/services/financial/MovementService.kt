package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Direction
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Origin
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnPayValidation
import br.com.webbudget.server.domain.validators.OnUndoPaymentValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.financial.MovementValidator
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import br.com.webbudget.server.infrastructure.repository.financial.PaymentRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class MovementService(
    private val walletLedger: WalletLedger,
    private val movementRepository: MovementRepository,
    private val paymentRepository: PaymentRepository,
    private val invoiceRepository: InvoiceRepository,
    private val cardPurchaseService: CardPurchaseService,
    @OnCreateValidation
    private val creationValidators: List<MovementValidator>,
    @OnUpdateValidation
    private val updateValidators: List<MovementValidator>,
    @OnDeleteValidation
    private val deletionValidators: List<MovementValidator>,
    @OnPayValidation
    private val paymentValidators: List<MovementValidator>,
    @OnUndoPaymentValidation
    private val undoPaymentValidators: List<MovementValidator>
) {

    @Transactional
    fun create(movement: Movement, payment: Payment? = null): UUID {

        creationValidators.forEach { it.validate(movement) }

        val created = movementRepository.insert(movement)

        if (payment != null) {
            pay(created, payment)
        }

        return created.externalId!!
    }

    @Transactional
    fun update(movement: Movement): Movement {

        updateValidators.forEach { it.validate(movement) }

        return movementRepository.update(movement)
    }

    @Transactional
    fun delete(movement: Movement) {

        deletionValidators.forEach { it.validate(movement) }

        movementRepository.delete(movement)

        movement.invoice?.let { invoiceRepository.updateStatus(it.id!!, Invoice.Status.CLOSED, Invoice.Status.OPEN) }
    }

    @Transactional
    fun pay(movement: Movement, payment: Payment): Movement {

        payment.value = movement.value
        movement.payment = payment

        paymentValidators.forEach { it.validate(movement) }

        paymentRepository.insert(movement.id!!, payment)

        movement.status = Movement.Status.PAID
        movementRepository.update(movement)

        if (payment.card != null) {
            cardPurchaseService.createFromMovement(movement, payment)
        } else {
            walletLedger.post(
                walletId = payment.wallet!!.id,
                direction = if (movement.type == Movement.Type.INCOME) Direction.CREDIT else Direction.DEBIT,
                origin = when {
                    movement.isInvoicePayment() -> Origin.INVOICE_PAYMENT
                    movement.type == Movement.Type.INCOME -> Origin.INCOME
                    else -> Origin.EXPENSE
                },
                value = payment.valuePaid,
                name = movement.name,
                movementId = movement.id,
                financialPeriodId = movement.financialPeriod.id
            )
        }

        movement.invoice?.let {
            invoiceRepository.updateStatus(it.id!!, Invoice.Status.CLOSED, Invoice.Status.PAID)
            it.status = Invoice.Status.PAID
        }

        return movement
    }

    @Transactional
    fun undoPayment(movement: Movement): Movement {

        undoPaymentValidators.forEach { it.validate(movement) }

        val payment = movement.payment!!

        paymentRepository.deleteByMovement(movement.id!!)

        movement.status = Movement.Status.OPEN
        movement.payment = null
        movementRepository.update(movement)

        if (payment.card != null) {
            cardPurchaseService.deleteFromMovement(movement)
        } else {
            walletLedger.post(
                walletId = payment.wallet!!.id,
                direction = if (movement.type == Movement.Type.INCOME) Direction.DEBIT else Direction.CREDIT,
                origin = Origin.REVERSAL,
                value = payment.valuePaid,
                name = movement.name,
                movementId = movement.id,
                financialPeriodId = movement.financialPeriod.id
            )
        }

        movement.invoice?.let {
            invoiceRepository.updateStatus(it.id!!, Invoice.Status.PAID, Invoice.Status.CLOSED)
            it.status = Invoice.Status.CLOSED
        }

        return movement
    }
}
