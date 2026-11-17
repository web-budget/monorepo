package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_OPEN
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(1)
@OnUpdateValidation
@OnCreateValidation
class PeriodMovementFinancialPeriodValidator : PeriodMovementValidator {

    override fun validate(value: PeriodMovement) {
        if (!value.financialPeriod.isOpen()) {
            throw DomainException("Financial period is not open", FINANCIAL_PERIOD_NOT_OPEN)
        }
    }
}
