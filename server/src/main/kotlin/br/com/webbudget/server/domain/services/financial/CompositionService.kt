package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Composition
import br.com.webbudget.server.infrastructure.repository.financial.CompositionRepository
import br.com.webbudget.server.infrastructure.repository.financial.PeriodDashboardRepository
import br.com.webbudget.server.infrastructure.repository.financial.PeriodFlowRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode

@Service
@Transactional(readOnly = true)
class CompositionService(
    private val compositionRepository: CompositionRepository,
    private val periodFlowRepository: PeriodFlowRepository,
    private val periodDashboardRepository: PeriodDashboardRepository
) {

    fun composition(year: Int?): Composition {

        val classifications = compositionRepository.sumExpensesByClassification(year)
        val incomeSources = compositionRepository.sumRevenuesByClassification(year)

        return Composition(
            years = periodFlowRepository.findYears(),
            expenses = classifications.sumOf { it.value },
            revenues = incomeSources.sumOf { it.value },
            costCenters = costCenters(year),
            classifications = classifications
                .sortedByDescending { it.value }
                .map { Composition.ClassificationValue(it.classificationId, it.classificationName, it.costCenterId!!, it.value) },
            seasonality = seasonality(year),
            incomeSources = incomeSources
                .sortedByDescending { it.value }
                .map { Composition.IncomeSource(it.classificationId, it.classificationName, it.value) }
        )
    }

    private fun costCenters(year: Int?): List<Composition.CostCenterValue> {

        val nodes = periodDashboardRepository.findCostCenters().associateBy { it.id }

        return compositionRepository.sumExpensesBySubtree(year)
            .sortedByDescending { it.value }
            .map { subtree ->
                val node = nodes.getValue(subtree.costCenterId)
                Composition.CostCenterValue(node.externalId, node.name, node.parentExternalId, subtree.value)
            }
    }

    private fun seasonality(year: Int?): List<Composition.Seasonality> {

        val yearsByMonth = compositionRepository.findMonthsWithMovement(year)
            .groupBy { it.month }
            .mapValues { (_, months) -> months.map { it.year }.distinct().size }

        return compositionRepository.sumExpensesByMonth(year)
            .groupBy { it.classificationId }
            .map { (classificationId, values) ->
                Composition.Seasonality(
                    id = classificationId,
                    name = values.first().classificationName,
                    months = (1..MONTHS).map { month ->
                        yearsByMonth[month]?.let { years ->
                            values.filter { it.month == month }
                                .sumOf { it.value }
                                .divide(BigDecimal(years), MONEY_SCALE, RoundingMode.HALF_UP)
                        }
                    }
                )
            }
            .sortedByDescending { seasonality -> seasonality.months.sumOf { it ?: BigDecimal.ZERO } }
    }

    companion object {
        private const val MONTHS = 12
        private const val MONEY_SCALE = 2
    }
}
