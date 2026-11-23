package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.LaunchRequest
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.registration.FinancialPeriodCreated
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class RecurringAutoLaunchListener(
    private val recurringLaunchService: RecurringLaunchService,
    private val recurringMovementRepository: RecurringMovementRepository,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    @Transactional
    @EventListener
    fun launch(event: FinancialPeriodCreated) {

        val financialPeriod = movementReferenceRepository.findFinancialPeriod(event.financialPeriodId)
            ?: throw ResourceNotFoundException()

        val requests = recurringMovementRepository.findAutoLaunchable().map { LaunchRequest(it, null) }

        event.recurringLaunch = recurringLaunchService.launch(financialPeriod, requests)
    }
}
