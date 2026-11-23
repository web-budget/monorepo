package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.payloads.financial.ClosingPeriodView
import br.com.webbudget.server.application.payloads.financial.FlowDashboardView
import br.com.webbudget.server.application.payloads.financial.FlowPeriodView
import br.com.webbudget.server.application.payloads.financial.FlowTotalsView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.BAD_REQUEST
import br.com.webbudget.server.domain.services.financial.FlowDashboardService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequiresRole(Role.DASHBOARDS)
@RequestMapping("/dashboards/financial-flow")
class FlowDashboardController(
    private val flowDashboardService: FlowDashboardService
) {

    @GetMapping
    fun get(@RequestParam(required = false) year: Int?): ResponseEntity<FlowDashboardView> {

        val requested = year ?: LocalDate.now().year

        if (requested !in MIN_YEAR..MAX_YEAR) {
            throw DomainException("The year must be between $MIN_YEAR and $MAX_YEAR", BAD_REQUEST)
        }

        val dashboard = flowDashboardService.flow(requested)

        return ResponseEntity.ok(
            FlowDashboardView(
                year = dashboard.year,
                totals = FlowTotalsView(dashboard.revenues, dashboard.expenses, dashboard.result),
                periods = dashboard.periods.map { period ->
                    FlowPeriodView(
                        financialPeriod = ClosingPeriodView(
                            period.financialPeriod.externalId,
                            period.financialPeriod.name,
                            period.financialPeriod.startingAt,
                            period.financialPeriod.endingAt
                        ),
                        revenues = period.revenues,
                        expenses = period.expenses,
                        result = period.result,
                        recorded = period.recorded
                    )
                }
            )
        )
    }

    companion object {
        private const val MIN_YEAR = 1900
        private const val MAX_YEAR = 9999
    }
}
