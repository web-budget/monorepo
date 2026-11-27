package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.PeriodDashboard
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.financial.PeriodDashboardRepository
import br.com.webbudget.server.infrastructure.repository.financial.ReportLineRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Service
@Transactional(readOnly = true)
class PeriodDashboardService(
    private val periodDashboardRepository: PeriodDashboardRepository,
    private val reportLineRepository: ReportLineRepository
) {

    fun dashboard(financialPeriod: UUID?): PeriodDashboard {

        val today = LocalDate.now()
        val currentPeriod = periodDashboardRepository.findCurrent(today) ?: throw ResourceNotFoundException()

        val period = financialPeriod
            ?.let { periodDashboardRepository.findByExternalId(it) ?: throw ResourceNotFoundException() }
            ?: currentPeriod

        val isCurrent = period.financialPeriod.id == currentPeriod.financialPeriod.id
        val totals = reportLineRepository.sumByType(period.financialPeriod.id)

        val revenues = totals.getValue(Movement.Type.INCOME)
        val expenses = totals.getValue(Movement.Type.EXPENSE)

        return PeriodDashboard(
            period = period,
            current = isCurrent,
            goals = PeriodDashboard.Goals(
                revenues = PeriodDashboard.Goal(revenues.total, period.revenuesGoal),
                expenses = PeriodDashboard.Goal(expenses.total, period.expensesGoal)
            ),
            fixedVsVariable = PeriodDashboard.FixedVsVariable(
                fixed = expenses.fixed,
                variable = expenses.total.subtract(expenses.fixed),
                revenuesGoal = period.revenuesGoal
            ),
            budget = budget(period.financialPeriod.id),
            upcoming = if (isCurrent) upcoming(today) else null,
            cards = cards(period)
        )
    }

    private fun upcoming(today: LocalDate): PeriodDashboard.Upcoming =
        PeriodDashboard.Upcoming(periodDashboardRepository.findUpcoming(today.plusDays(UPCOMING_DAYS), today))

    private fun budget(financialPeriodId: Long): List<PeriodDashboard.BudgetLine> {

        val nodes = periodDashboardRepository.findCostCenters().associateBy<PeriodDashboard.CostCenterNode, Long?> { it.id }
        val used = reportLineRepository.sumBySubtree(financialPeriodId).associate { (it.costCenterId to it.type) to it.value }

        val suggested = if (reportLineRepository.countClosedPeriods() >= ReportLineRepository.SUGGESTION_MINIMUM) {
            reportLineRepository.medianBySubtree().associate { (it.costCenterId to it.type) to it.value }
        } else {
            emptyMap()
        }

        val withFigures = nodes.values.filter { node ->
            node.expenseBudget != null || node.incomeBudget != null ||
                TYPES.any { type -> (node.id to type) in used || (node.id to type) in suggested }
        }

        val relevant = withFigures
            .flatMap { node -> generateSequence(node) { child -> nodes[child.parentId] }.toList() }
            .distinctBy { it.id }

        return relevant
            .sortedBy { it.name.lowercase() }
            .map { node ->
                PeriodDashboard.BudgetLine(
                    costCenter = node,
                    expense = PeriodDashboard.BudgetFigures(
                        budget = node.expenseBudget,
                        used = used[node.id to Movement.Type.EXPENSE.name] ?: BigDecimal.ZERO,
                        suggested = suggested[node.id to Movement.Type.EXPENSE.name]
                    ),
                    income = PeriodDashboard.BudgetFigures(
                        budget = node.incomeBudget,
                        used = used[node.id to Movement.Type.INCOME.name] ?: BigDecimal.ZERO,
                        suggested = suggested[node.id to Movement.Type.INCOME.name]
                    )
                )
            }
    }

    private fun cards(period: PeriodDashboard.Period): List<PeriodDashboard.CardUsage> {

        val window = periodDashboardRepository.findWindow(period.financialPeriod.endingAt, CARD_HISTORY)
        val invoices = periodDashboardRepository.findCardInvoices(window.map { it.id })

        return invoices
            .groupBy { it.cardId }
            .filterValues { cardInvoices -> cardInvoices.any { it.purchases.signum() > 0 } }
            .map { (_, cardInvoices) ->

                val byPeriod = cardInvoices.associateBy { it.financialPeriodId }
                val chosen = byPeriod[period.financialPeriod.id]
                val first = cardInvoices.first()

                PeriodDashboard.CardUsage(
                    id = first.cardExternalId,
                    name = first.cardName,
                    lastFourDigits = first.lastFourDigits,
                    invoiceId = chosen?.invoiceExternalId,
                    invoiceStatus = chosen?.invoiceStatus,
                    purchases = chosen?.purchases ?: BigDecimal.ZERO,
                    history = window.map { windowPeriod ->
                        PeriodDashboard.CardPeriodPurchases(
                            financialPeriodId = windowPeriod.externalId,
                            financialPeriodName = windowPeriod.name,
                            purchases = byPeriod[windowPeriod.id]?.purchases ?: BigDecimal.ZERO
                        )
                    }
                )
            }
    }

    companion object {
        private const val UPCOMING_DAYS = 30L
        private const val CARD_HISTORY = 12
        private val TYPES = Movement.Type.entries.map { it.name }
    }
}
