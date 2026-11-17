package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.ACCOUNTED_PERIOD_MOVEMENT
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

@Component
@Order(2)
@OnDeleteValidation
@OnUpdateValidation
@OnCreateValidation
class PeriodMovementAccountedValidator : PeriodMovementValidator {

    override fun validate(value: PeriodMovement) {
        if (value.isAccounted()) {
            throw DomainException("Period movement is accounted", ACCOUNTED_PERIOD_MOVEMENT)
        }
    }
}
