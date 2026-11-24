package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.ClosingSummary
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class ClosingSummaryService(
    private val movementRepository: MovementRepository,
    private val invoiceRepository: InvoiceRepository,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun summarize(financialPeriod: FinancialPeriodReference): ClosingSummary {

        val invoices = invoiceRepository.findByFinancialPeriod(financialPeriod.id)
        val (invoicesWithPurchases, emptyInvoices) = invoices.filter { it.isOpen() }.partition { it.purchaseCount > 0 }

        return ClosingSummary(
            openMovements = movementRepository.summarizeOpenByType(financialPeriod.id),
            invoices = invoices,
            openInvoices = invoicesWithPurchases,
            emptyInvoices = emptyInvoices,
            nextOpenPeriod = movementReferenceRepository.findNextOpenFinancialPeriod(financialPeriod.endingAt),
            targetPeriods = movementReferenceRepository.findOpenFinancialPeriodsExcept(financialPeriod.id)
        )
    }
}
