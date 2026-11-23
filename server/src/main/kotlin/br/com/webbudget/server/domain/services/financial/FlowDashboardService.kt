package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.FlowDashboard
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import br.com.webbudget.server.infrastructure.repository.financial.PeriodResultRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class FlowDashboardService(
    private val movementRepository: MovementRepository,
    private val periodResultRepository: PeriodResultRepository,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun flow(year: Int): FlowDashboard {

        val financialPeriods = movementReferenceRepository.findFinancialPeriodsEndingBetween(
            LocalDate.of(year, 1, 1),
            LocalDate.of(year, 12, 31)
        )

        val recorded = periodResultRepository.findByFinancialPeriods(financialPeriods.map { it.id })
        val provisional = movementRepository.sumPaidValueByPeriodAndType(
            financialPeriods.map { it.id }.filter { it !in recorded }
        )

        return FlowDashboard(
            year = year,
            periods = financialPeriods.map { financialPeriod ->
                val periodResult = recorded[financialPeriod.id]
                val paid = provisional[financialPeriod.id]

                FlowDashboard.FlowPeriod(
                    financialPeriod = financialPeriod,
                    revenues = periodResult?.revenues ?: paid?.get(Movement.Type.INCOME) ?: BigDecimal.ZERO,
                    expenses = periodResult?.expenses ?: paid?.get(Movement.Type.EXPENSE) ?: BigDecimal.ZERO,
                    recorded = periodResult != null
                )
            }
        )
    }
}
