package br.com.webbudget.server.domain.services.registration

import br.com.webbudget.server.domain.entities.financial.RecurringLaunchReport
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.registration.FinancialPeriodValidator
import br.com.webbudget.server.infrastructure.repository.registration.FinancialPeriodRepository
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

class FinancialPeriodCreated(val financialPeriodId: Long) {
    var recurringLaunch: RecurringLaunchReport? = null
}

data class FinancialPeriodCreation(val externalId: UUID, val recurringLaunch: RecurringLaunchReport?)

data class FinancialPeriodDeleting(val financialPeriodId: Long)

@Service
@Transactional(readOnly = true)
class FinancialPeriodService(
    private val financialPeriodRepository: FinancialPeriodRepository,
    private val eventPublisher: ApplicationEventPublisher,
    @OnCreateValidation
    private val creationValidators: List<FinancialPeriodValidator>,
    @OnUpdateValidation
    private val updateValidators: List<FinancialPeriodValidator>,
    @OnDeleteValidation
    private val deleteValidators: List<FinancialPeriodValidator>
) {

    @Transactional
    fun create(financialPeriod: FinancialPeriod): FinancialPeriodCreation {

        creationValidators.forEach { it.validate(financialPeriod) }

        val created = financialPeriodRepository.insert(financialPeriod)

        val event = FinancialPeriodCreated(created.id!!)

        eventPublisher.publishEvent(event)

        return FinancialPeriodCreation(created.externalId!!, event.recurringLaunch)
    }

    @Transactional
    fun update(financialPeriod: FinancialPeriod): FinancialPeriod {

        updateValidators.forEach { it.validate(financialPeriod) }

        return financialPeriodRepository.update(financialPeriod)
    }

    @Transactional
    fun delete(financialPeriod: FinancialPeriod) {

        deleteValidators.forEach { it.validate(financialPeriod) }

        eventPublisher.publishEvent(FinancialPeriodDeleting(financialPeriod.id!!))

        financialPeriodRepository.delete(financialPeriod)
    }
}
