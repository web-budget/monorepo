package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Accumulated
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import br.com.webbudget.server.infrastructure.repository.financial.PeriodResultRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
@Transactional(readOnly = true)
class AccumulatedService(
    private val movementRepository: MovementRepository,
    private val periodResultRepository: PeriodResultRepository,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun accumulate(): Accumulated {

        val openPeriods = movementReferenceRepository.findOpenFinancialPeriods()
        val paid = movementRepository.sumPaidValueByPeriodAndType(openPeriods.map { it.id })

        return Accumulated(
            recorded = periodResultRepository.sumRecorded(),
            provisionalPeriods = openPeriods.map { period ->
                val revenues = paid[period.id]?.get(Movement.Type.INCOME) ?: BigDecimal.ZERO
                val expenses = paid[period.id]?.get(Movement.Type.EXPENSE) ?: BigDecimal.ZERO
                Accumulated.ProvisionalResult(period, revenues.subtract(expenses))
            }
        )
    }
}
