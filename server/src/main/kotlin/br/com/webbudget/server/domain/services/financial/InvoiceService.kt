package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.services.registration.CardSaved
import br.com.webbudget.server.domain.services.registration.FinancialPeriodCreated
import br.com.webbudget.server.domain.services.registration.FinancialPeriodDeleting
import br.com.webbudget.server.domain.validators.OnCloseValidation
import br.com.webbudget.server.domain.validators.financial.InvoiceValidator
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class InvoiceService(
    private val invoiceRepository: InvoiceRepository,
    private val movementRepository: MovementRepository,
    @OnCloseValidation
    private val closingValidators: List<InvoiceValidator>
) {

    @Transactional
    @EventListener
    fun openInvoices(event: FinancialPeriodCreated) {
        invoiceRepository.findActiveCards().forEach { card ->
            invoiceRepository.insert(card.id, event.financialPeriodId, Invoice.Status.OPEN)
        }
    }

    @Transactional
    @EventListener
    fun reconcileInvoices(event: CardSaved) {

        if (!event.active) {
            invoiceRepository.deleteEmptyOpenByCard(event.cardId)
            return
        }

        invoiceRepository.findOpenFinancialPeriodIds()
            .filterNot { invoiceRepository.existsByCardAndFinancialPeriod(event.cardId, it) }
            .forEach { invoiceRepository.insert(event.cardId, it, Invoice.Status.OPEN) }
    }

    @Transactional
    @EventListener
    fun deleteInvoices(event: FinancialPeriodDeleting) {
        invoiceRepository.deleteByFinancialPeriod(event.financialPeriodId)
    }

    @Transactional
    fun close(invoice: Invoice): Invoice {

        closingValidators.forEach { it.validate(invoice) }

        val payment = Movement(
            name = "${invoice.card.name} - ${invoice.financialPeriod.name}".take(MAX_NAME_LENGTH),
            type = Movement.Type.EXPENSE,
            value = invoice.value,
            dueDate = invoice.paymentDueDate(LocalDate.now()),
            classification = null,
            costCenter = null,
            financialPeriod = invoice.financialPeriod,
            invoice = invoice
        )

        movementRepository.insert(payment)
        invoiceRepository.updateStatus(invoice.id!!, Invoice.Status.OPEN, Invoice.Status.CLOSED)

        return invoiceRepository.findByExternalId(invoice.externalId!!)!!
    }

    companion object {
        private const val MAX_NAME_LENGTH = 150
    }
}
