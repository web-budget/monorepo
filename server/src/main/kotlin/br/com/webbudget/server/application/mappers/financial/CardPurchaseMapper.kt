package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.CardPurchaseCreateForm
import br.com.webbudget.server.application.payloads.financial.CardPurchaseListView
import br.com.webbudget.server.application.payloads.financial.CardPurchaseUpdateForm
import br.com.webbudget.server.application.payloads.financial.CardPurchaseView
import br.com.webbudget.server.application.payloads.financial.InvoicePaymentView
import br.com.webbudget.server.application.payloads.financial.InvoiceSummaryView
import br.com.webbudget.server.application.payloads.financial.InvoiceView
import br.com.webbudget.server.application.payloads.financial.MovementClassificationView
import br.com.webbudget.server.application.payloads.financial.MovementCostCenterView
import br.com.webbudget.server.application.payloads.financial.MovementFinancialPeriodView
import br.com.webbudget.server.application.payloads.financial.PaymentCardView
import br.com.webbudget.server.domain.entities.financial.CardPurchase
import br.com.webbudget.server.domain.entities.financial.CardReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import org.springframework.stereotype.Component
import java.time.LocalDate

@Component
class CardPurchaseMapper(
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun mapToView(purchase: CardPurchase): CardPurchaseView = CardPurchaseView(
        id = purchase.externalId!!,
        name = purchase.name,
        purchasedOn = purchase.purchasedOn,
        value = purchase.value,
        card = mapToCardView(purchase.card),
        invoice = mapToSummary(purchase.invoice!!),
        financialPeriod = mapToPeriodView(purchase.financialPeriod),
        classification = MovementClassificationView(
            purchase.classification.externalId,
            purchase.classification.name,
            purchase.classification.type
        ),
        costCenter = MovementCostCenterView(
            purchase.costCenter.externalId,
            purchase.costCenter.name,
            purchase.costCenter.fullName
        ),
        movement = purchase.movementExternalId
    )

    fun mapToListView(purchase: CardPurchase): CardPurchaseListView = CardPurchaseListView(
        id = purchase.externalId!!,
        name = purchase.name,
        purchasedOn = purchase.purchasedOn,
        value = purchase.value,
        card = mapToCardView(purchase.card),
        invoice = mapToSummary(purchase.invoice!!),
        classification = MovementClassificationView(
            purchase.classification.externalId,
            purchase.classification.name,
            purchase.classification.type
        ),
        costCenter = MovementCostCenterView(
            purchase.costCenter.externalId,
            purchase.costCenter.name,
            purchase.costCenter.fullName
        )
    )

    fun mapToView(invoice: Invoice): InvoiceView = InvoiceView(
        id = invoice.externalId!!,
        status = invoice.status.name,
        value = invoice.value,
        purchaseCount = invoice.purchaseCount,
        dueDate = invoice.payment?.dueDate,
        card = mapToCardView(invoice.card),
        financialPeriod = mapToPeriodView(invoice.financialPeriod),
        payment = invoice.payment?.let { InvoicePaymentView(it.externalId, it.name, it.value) }
    )

    fun mapToDomain(form: CardPurchaseCreateForm): CardPurchase = CardPurchase(
        name = form.name!!,
        purchasedOn = form.purchasedOn ?: LocalDate.now(),
        value = form.value!!,
        classification = movementReferenceRepository.findClassification(form.classification!!)
            ?: throw ResourceNotFoundException(),
        costCenter = movementReferenceRepository.findCostCenter(form.costCenter!!)
            ?: throw ResourceNotFoundException(),
        card = movementReferenceRepository.findCard(form.card!!) ?: throw ResourceNotFoundException(),
        financialPeriod = movementReferenceRepository.findFinancialPeriod(form.financialPeriod!!)
            ?: throw ResourceNotFoundException()
    )

    fun mapToDomain(form: CardPurchaseUpdateForm, purchase: CardPurchase): CardPurchase = purchase.apply {
        this.name = form.name!!
        this.purchasedOn = form.purchasedOn ?: this.purchasedOn
        this.value = form.value!!
        this.classification = movementReferenceRepository.findClassification(form.classification!!)
            ?: throw ResourceNotFoundException()
        this.costCenter = movementReferenceRepository.findCostCenter(form.costCenter!!)
            ?: throw ResourceNotFoundException()
    }

    private fun mapToCardView(card: CardReference) = PaymentCardView(card.externalId, card.name, card.lastFourDigits)

    private fun mapToSummary(invoice: Invoice) = InvoiceSummaryView(invoice.externalId!!, invoice.status.name)

    private fun mapToPeriodView(period: FinancialPeriodReference) = MovementFinancialPeriodView(
        id = period.externalId,
        name = period.name,
        status = period.status.name,
        expired = period.isExpired(LocalDate.now())
    )
}
