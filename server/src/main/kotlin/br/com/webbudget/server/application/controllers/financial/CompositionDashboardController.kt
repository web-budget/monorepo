package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.payloads.financial.CompositionClassificationView
import br.com.webbudget.server.application.payloads.financial.CompositionCostCenterView
import br.com.webbudget.server.application.payloads.financial.CompositionIncomeSourceView
import br.com.webbudget.server.application.payloads.financial.CompositionSeasonalityView
import br.com.webbudget.server.application.payloads.financial.CompositionView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.services.financial.CompositionService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequiresRole(Role.DASHBOARDS)
@RequestMapping("/dashboards/composition")
class CompositionDashboardController(
    private val compositionService: CompositionService
) {

    @GetMapping
    fun get(@RequestParam(required = false) year: String?): ResponseEntity<CompositionView> {

        val cut = parseDashboardYear(year)
        val composition = compositionService.composition(cut)

        return ResponseEntity.ok(
            CompositionView(
                cut = cut?.toString() ?: ALL_PERIODS,
                years = composition.years,
                expenses = composition.expenses,
                revenues = composition.revenues,
                costCenters = composition.costCenters.map { costCenter ->
                    CompositionCostCenterView(costCenter.id, costCenter.name, costCenter.parent, costCenter.value)
                },
                classifications = composition.classifications.map { classification ->
                    CompositionClassificationView(
                        classification.id,
                        classification.name,
                        classification.costCenter,
                        classification.value
                    )
                },
                seasonality = composition.seasonality.map { seasonality ->
                    CompositionSeasonalityView(seasonality.id, seasonality.name, seasonality.months)
                },
                incomeSources = composition.incomeSources.map { source ->
                    CompositionIncomeSourceView(source.id, source.name, source.value)
                }
            )
        )
    }
}
