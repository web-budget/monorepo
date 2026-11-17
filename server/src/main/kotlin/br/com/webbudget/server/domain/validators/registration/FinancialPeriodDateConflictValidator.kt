package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.START_DATE_AFTER_END_DATE
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
@OnCreateValidation
class FinancialPeriodDateConflictValidator : FinancialPeriodValidator {

    override fun validate(value: FinancialPeriod) {
        if (value.startingAt.isAfter(value.endingAt)) {
            throw DomainException("Start date must be before end date", START_DATE_AFTER_END_DATE)
        }
    }
}
