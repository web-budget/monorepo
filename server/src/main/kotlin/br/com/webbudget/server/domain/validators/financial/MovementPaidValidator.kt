package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.MOVEMENT_NOT_PAID
import br.com.webbudget.server.domain.validators.OnUndoPaymentValidation
import org.springframework.stereotype.Component

@Component
@OnUndoPaymentValidation
class MovementPaidValidator : MovementValidator {

    override fun validate(value: Movement) {
        if (!value.isPaid()) {
            throw DomainException("The movement is not paid", MOVEMENT_NOT_PAID)
        }
    }
}
