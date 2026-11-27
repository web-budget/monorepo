package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Overview
import br.com.webbudget.server.infrastructure.repository.financial.PeriodFlowRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class OverviewService(
    private val periodFlowRepository: PeriodFlowRepository
) {

    fun overview(year: Int?): Overview = Overview(
        years = periodFlowRepository.findYears(),
        totals = periodFlowRepository.sumTotals(year),
        resultByYear = periodFlowRepository.sumByYear(),
        periods = periodFlowRepository.findPeriods(year)
    )
}
