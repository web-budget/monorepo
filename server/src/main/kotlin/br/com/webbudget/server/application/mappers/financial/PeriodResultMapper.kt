package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.AccumulatedView
import br.com.webbudget.server.application.payloads.financial.ClosingPeriodView
import br.com.webbudget.server.application.payloads.financial.PeriodResultView
import br.com.webbudget.server.application.payloads.financial.ProvisionalResultView
import br.com.webbudget.server.domain.entities.financial.Accumulated
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.PeriodResult
import org.springframework.stereotype.Component

@Component
class PeriodResultMapper {

    fun mapToView(periodResult: PeriodResult): PeriodResultView = PeriodResultView(
        id = periodResult.externalId!!,
        name = periodResult.financialPeriod.name,
        financialPeriod = mapToPeriodView(periodResult.financialPeriod),
        revenues = periodResult.revenues,
        expenses = periodResult.expenses,
        result = periodResult.result
    )

    fun mapToView(accumulated: Accumulated): AccumulatedView = AccumulatedView(
        recorded = accumulated.recorded,
        provisional = accumulated.provisional,
        accumulated = accumulated.accumulated,
        provisionalPeriods = accumulated.provisionalPeriods.map {
            ProvisionalResultView(mapToPeriodView(it.financialPeriod), it.result)
        }
    )

    private fun mapToPeriodView(period: FinancialPeriodReference) =
        ClosingPeriodView(period.externalId, period.name, period.startingAt, period.endingAt)
}
