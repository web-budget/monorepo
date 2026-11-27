package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.payloads.financial.ClosingPeriodView
import br.com.webbudget.server.application.payloads.financial.OverviewPeriodView
import br.com.webbudget.server.application.payloads.financial.OverviewTotalsView
import br.com.webbudget.server.application.payloads.financial.OverviewView
import br.com.webbudget.server.application.payloads.financial.OverviewYearResultView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.BAD_REQUEST
import br.com.webbudget.server.domain.services.financial.OverviewService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequiresRole(Role.DASHBOARDS)
@RequestMapping("/dashboards/overview")
class OverviewDashboardController(
    private val overviewService: OverviewService
) {

    @GetMapping
    fun get(@RequestParam(required = false) year: String?): ResponseEntity<OverviewView> {

        val cut = parseCut(year)
        val overview = overviewService.overview(cut)

        return ResponseEntity.ok(
            OverviewView(
                cut = cut?.toString() ?: ALL,
                years = overview.years,
                totals = OverviewTotalsView(
                    revenues = overview.totals.revenues,
                    expenses = overview.totals.expenses,
                    result = overview.totals.result,
                    savingsRate = overview.totals.savingsRate,
                    redPeriods = overview.totals.redPeriods,
                    periodsWithMovement = overview.totals.periodsWithMovement
                ),
                resultByYear = overview.resultByYear.map { yearResult ->
                    OverviewYearResultView(
                        year = yearResult.year,
                        revenues = yearResult.revenues,
                        expenses = yearResult.expenses,
                        result = yearResult.result,
                        savingsRate = yearResult.savingsRate,
                        provisional = yearResult.provisional
                    )
                },
                periods = overview.periods.map { period ->
                    OverviewPeriodView(
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

    private fun parseCut(year: String?): Int? {

        if (year == null) {
            return LocalDate.now().year
        }

        if (year == ALL) {
            return null
        }

        val parsed = year.toIntOrNull()

        if (parsed == null || parsed !in MIN_YEAR..MAX_YEAR) {
            throw DomainException("The year must be $ALL or between $MIN_YEAR and $MAX_YEAR", BAD_REQUEST)
        }

        return parsed
    }

    companion object {
        private const val ALL = "all"
        private const val MIN_YEAR = 1900
        private const val MAX_YEAR = 9999
    }
}
