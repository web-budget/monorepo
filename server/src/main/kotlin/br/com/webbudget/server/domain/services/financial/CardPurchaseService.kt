package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.CardPurchase
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVOICE_NOT_OPEN
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.financial.CardPurchaseValidator
import br.com.webbudget.server.infrastructure.repository.financial.CardPurchaseRepository
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class CardPurchaseService(
    private val invoiceRepository: InvoiceRepository,
    private val cardPurchaseRepository: CardPurchaseRepository,
    @OnCreateValidation
    private val creationValidators: List<CardPurchaseValidator>,
    @OnUpdateValidation
    private val updateValidators: List<CardPurchaseValidator>,
    @OnDeleteValidation
    private val deletionValidators: List<CardPurchaseValidator>
) {

    @Transactional
    fun create(purchase: CardPurchase): UUID {

        purchase.invoice = invoiceRepository.findByCardAndFinancialPeriod(purchase.card.id, purchase.financialPeriod.id)

        creationValidators.forEach { it.validate(purchase) }

        return cardPurchaseRepository.insert(purchase).externalId!!
    }

    @Transactional
    fun createFromMovement(movement: Movement, payment: Payment): UUID = create(
        CardPurchase(
            name = movement.name,
            purchasedOn = payment.paidOn,
            value = payment.valuePaid,
            classification = movement.classification!!,
            costCenter = movement.costCenter!!,
            card = payment.card!!,
            financialPeriod = movement.financialPeriod,
            movementId = movement.id
        )
    )

    @Transactional
    fun update(purchase: CardPurchase): CardPurchase {

        updateValidators.forEach { it.validate(purchase) }

        return cardPurchaseRepository.update(purchase)
    }

    @Transactional
    fun delete(purchase: CardPurchase) {

        deletionValidators.forEach { it.validate(purchase) }

        cardPurchaseRepository.delete(purchase)
    }

    @Transactional
    fun deleteFromMovement(movement: Movement) {

        val purchase = cardPurchaseRepository.findByMovement(movement.id!!)!!

        if (!purchase.invoice!!.isOpen()) {
            throw DomainException("The invoice of the purchase is not open", INVOICE_NOT_OPEN)
        }

        cardPurchaseRepository.delete(purchase)
    }
}
