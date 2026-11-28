package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Overview
import br.com.webbudget.server.domain.services.administration.InstanceSettingsService
import br.com.webbudget.server.infrastructure.repository.financial.PeriodFlowRepository
import br.com.webbudget.server.infrastructure.repository.financial.ReliabilityRepository
import br.com.webbudget.server.infrastructure.repository.registration.CompartmentRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.RoundingMode

@Service
@Transactional(readOnly = true)
class OverviewService(
    private val periodFlowRepository: PeriodFlowRepository,
    private val reliabilityRepository: ReliabilityRepository,
    private val compartmentRepository: CompartmentRepository,
    private val accumulatedService: AccumulatedService,
    private val instanceSettingsService: InstanceSettingsService
) {

    fun overview(year: Int?): Overview {

        val accumulated = accumulatedService.accumulate().accumulated
        val costOfLiving = reliabilityRepository.medianExpenseOfClosedPeriods()
        val months = instanceSettingsService.reserveMonths()
        val walletBalances = reliabilityRepository.sumWalletTotals()

        return Overview(
            years = periodFlowRepository.findYears(),
            totals = periodFlowRepository.sumTotals(year),
            resultByYear = periodFlowRepository.sumByYear(),
            periods = periodFlowRepository.findPeriods(year),
            accumulated = accumulated,
            costOfLiving = costOfLiving,
            reserve = Overview.Reserve(
                current = compartmentRepository.sumReserveBalance(),
                months = months,
                ideal = costOfLiving.value?.multiply(months.toBigDecimal())?.setScale(MONEY_SCALE, RoundingMode.HALF_UP)
            ),
            reliability = Overview.Reliability(
                accumulated = accumulated,
                balancesTotal = walletBalances.total,
                walletCount = walletBalances.count,
                adjustmentsTotal = reliabilityRepository.sumAdjustmentsNet(),
                adjustments = reliabilityRepository.sumAdjustments(year),
                generic = Overview.Generic(
                    value = reliabilityRepository.sumGenericExpenses(year),
                    total = reliabilityRepository.sumExpenses(year),
                    classifications = reliabilityRepository.findGenericClassifications()
                )
            )
        )
    }

    companion object {
        private const val MONEY_SCALE = 2
    }
}
