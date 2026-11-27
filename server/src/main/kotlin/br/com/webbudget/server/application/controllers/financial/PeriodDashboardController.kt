package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.payloads.financial.BudgetCostCenterView
import br.com.webbudget.server.application.payloads.financial.BudgetFiguresView
import br.com.webbudget.server.application.payloads.financial.BudgetLineView
import br.com.webbudget.server.application.payloads.financial.CardHistoryView
import br.com.webbudget.server.application.payloads.financial.FixedVsVariableView
import br.com.webbudget.server.application.payloads.financial.PeriodCardView
import br.com.webbudget.server.application.payloads.financial.PeriodDashboardPeriodView
import br.com.webbudget.server.application.payloads.financial.PeriodDashboardView
import br.com.webbudget.server.application.payloads.financial.PeriodGoalView
import br.com.webbudget.server.application.payloads.financial.PeriodGoalsView
import br.com.webbudget.server.application.payloads.financial.UpcomingItemView
import br.com.webbudget.server.application.payloads.financial.UpcomingPeriodView
import br.com.webbudget.server.application.payloads.financial.UpcomingView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.financial.PeriodDashboard
import br.com.webbudget.server.domain.services.financial.PeriodDashboardService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequiresRole(Role.DASHBOARDS)
@RequestMapping("/dashboards/period")
class PeriodDashboardController(
    private val periodDashboardService: PeriodDashboardService
) {

    @GetMapping
    fun get(@RequestParam(required = false) financialPeriod: UUID?): ResponseEntity<PeriodDashboardView> =
        ResponseEntity.ok(periodDashboardService.dashboard(financialPeriod).toView())

    private fun PeriodDashboard.toView(): PeriodDashboardView = PeriodDashboardView(
        period = PeriodDashboardPeriodView(
            id = period.financialPeriod.externalId,
            name = period.financialPeriod.name,
            startingAt = period.financialPeriod.startingAt,
            endingAt = period.financialPeriod.endingAt,
            status = period.financialPeriod.status.name,
            current = current
        ),
        goals = PeriodGoalsView(
            revenues = PeriodGoalView(goals.revenues.realized, goals.revenues.goal),
            expenses = PeriodGoalView(goals.expenses.realized, goals.expenses.goal)
        ),
        fixedVsVariable = FixedVsVariableView(
            fixed = fixedVsVariable.fixed,
            variable = fixedVsVariable.variable,
            fixedShareOfRevenueGoal = fixedVsVariable.fixedShareOfRevenueGoal
        ),
        budget = budget.map { line ->
            BudgetLineView(
                costCenter = BudgetCostCenterView(
                    id = line.costCenter.externalId,
                    name = line.costCenter.name,
                    parent = line.costCenter.parentExternalId
                ),
                expense = line.expense.toView(),
                income = line.income.toView()
            )
        },
        upcoming = upcoming?.let { pending ->
            UpcomingView(
                toReceive = pending.toReceive,
                toPay = pending.toPay,
                items = pending.items.map { item ->
                    UpcomingItemView(
                        id = item.id,
                        name = item.name,
                        type = item.type,
                        value = item.value,
                        dueDate = item.dueDate,
                        financialPeriod = UpcomingPeriodView(item.financialPeriodId, item.financialPeriodName),
                        invoicePayment = item.invoicePayment,
                        overdue = item.overdue
                    )
                }
            )
        },
        cards = cards.map { card ->
            PeriodCardView(
                id = card.id,
                name = card.name,
                lastFourDigits = card.lastFourDigits,
                invoiceId = card.invoiceId,
                invoiceStatus = card.invoiceStatus,
                purchases = card.purchases,
                history = card.history.map { entry ->
                    CardHistoryView(UpcomingPeriodView(entry.financialPeriodId, entry.financialPeriodName), entry.purchases)
                }
            )
        }
    )

    private fun PeriodDashboard.BudgetFigures.toView(): BudgetFiguresView = BudgetFiguresView(budget, used, suggested)
}
