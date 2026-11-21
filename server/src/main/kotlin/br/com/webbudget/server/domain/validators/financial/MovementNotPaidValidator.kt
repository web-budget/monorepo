package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.MOVEMENT_ALREADY_PAID
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnPayValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
@OnDeleteValidation
@OnPayValidation
class MovementNotPaidValidator : MovementValidator {

    override fun validate(value: Movement) {
        if (value.isPaid()) {
            throw DomainException("A paid movement can not be changed, undo the payment first", MOVEMENT_ALREADY_PAID)
        }
    }
}
