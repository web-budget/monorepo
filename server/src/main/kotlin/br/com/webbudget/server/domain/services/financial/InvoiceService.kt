package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.services.registration.FinancialPeriodCreated
import br.com.webbudget.server.domain.services.registration.FinancialPeriodDeleting
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class InvoiceService(
    private val invoiceRepository: InvoiceRepository
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
    fun deleteInvoices(event: FinancialPeriodDeleting) {
        invoiceRepository.deleteByFinancialPeriod(event.financialPeriodId)
    }
}
