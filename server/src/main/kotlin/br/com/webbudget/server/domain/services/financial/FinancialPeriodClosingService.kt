package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.PeriodResult
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod.Status
import br.com.webbudget.server.domain.validators.OnCloseValidation
import br.com.webbudget.server.domain.validators.OnReopenValidation
import br.com.webbudget.server.domain.validators.financial.FinancialPeriodClosingValidator
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import br.com.webbudget.server.infrastructure.repository.financial.PeriodResultRepository
import br.com.webbudget.server.infrastructure.repository.registration.FinancialPeriodRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
@Transactional(readOnly = true)
class FinancialPeriodClosingService(
    private val movementRepository: MovementRepository,
    private val invoiceRepository: InvoiceRepository,
    private val periodResultRepository: PeriodResultRepository,
    private val financialPeriodRepository: FinancialPeriodRepository,
    @OnCloseValidation
    private val closingValidators: List<FinancialPeriodClosingValidator>,
    @OnReopenValidation
    private val reopeningValidators: List<FinancialPeriodClosingValidator>
) {

    @Transactional
    fun close(financialPeriod: FinancialPeriodReference): PeriodResult {

        closingValidators.forEach { it.validate(financialPeriod) }

        invoiceRepository.closeEmptyAutomatically(financialPeriod.id)

        val paid = movementRepository.sumPaidValueByType(financialPeriod.id)

        val periodResult = periodResultRepository.insert(
            PeriodResult(
                financialPeriod = financialPeriod,
                revenues = paid[Movement.Type.INCOME] ?: BigDecimal.ZERO,
                expenses = paid[Movement.Type.EXPENSE] ?: BigDecimal.ZERO
            )
        )

        financialPeriodRepository.updateStatus(financialPeriod.id, Status.OPEN, Status.CLOSED)

        return periodResult
    }

    @Transactional
    fun reopen(financialPeriod: FinancialPeriodReference) {

        reopeningValidators.forEach { it.validate(financialPeriod) }

        periodResultRepository.deleteByFinancialPeriod(financialPeriod.id)
        invoiceRepository.reopenClosedAutomatically(financialPeriod.id)
        financialPeriodRepository.updateStatus(financialPeriod.id, Status.CLOSED, Status.OPEN)
    }
}
