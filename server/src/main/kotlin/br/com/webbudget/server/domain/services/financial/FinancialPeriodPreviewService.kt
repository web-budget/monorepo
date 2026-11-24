package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.FinancialPeriodCreationPreview
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class FinancialPeriodPreviewService(
    private val recurringMovementRepository: RecurringMovementRepository,
    private val invoiceRepository: InvoiceRepository
) {

    fun creationPreview(): FinancialPeriodCreationPreview = FinancialPeriodCreationPreview(
        recurringMovements = recurringMovementRepository.findAutoLaunchableRecurringMovements(),
        cards = invoiceRepository.findActiveCards()
    )
}
