package br.com.webbudget.server.domain.services.registration

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

data class FinancialPeriodCreated(val financialPeriodId: Long)

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
    fun create(financialPeriod: FinancialPeriod): UUID {

        creationValidators.forEach { it.validate(financialPeriod) }

        val created = financialPeriodRepository.insert(financialPeriod)

        eventPublisher.publishEvent(FinancialPeriodCreated(created.id!!))

        return created.externalId!!
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
