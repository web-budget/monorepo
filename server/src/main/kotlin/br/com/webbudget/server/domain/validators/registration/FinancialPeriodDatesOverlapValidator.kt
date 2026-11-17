package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.OVERLAPPING_START_END_DATES
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.registration.FinancialPeriodRepository
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
@OnCreateValidation
class FinancialPeriodDatesOverlapValidator(
    private val financialPeriodRepository: FinancialPeriodRepository
) : FinancialPeriodValidator {

    override fun validate(value: FinancialPeriod) {

        val overlapping = if (value.isSaved()) {
            financialPeriodRepository.existsOpenBetweenAndExternalIdNot(
                value.startingAt,
                value.endingAt,
                value.externalId!!
            )
        } else {
            financialPeriodRepository.existsOpenBetween(value.startingAt, value.endingAt)
        }

        if (overlapping) {
            throw DomainException(
                "Period start and end dates are overlapping with other open periods",
                OVERLAPPING_START_END_DATES
            )
        }
    }
}
