package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.CompartmentMovement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_WALLET
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_COMPARTMENT_MOVEMENT_VALUE
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCreateValidation
import org.springframework.stereotype.Component

interface CompartmentMovementValidator : BusinessValidator<CompartmentMovement>

@Component
@OnCreateValidation
class CompartmentMovementValueValidator : CompartmentMovementValidator {

    override fun validate(value: CompartmentMovement) {
        if (value.value.signum() <= 0) {
            throw DomainException("The movement value must be greater than zero", INVALID_COMPARTMENT_MOVEMENT_VALUE)
        }
    }
}

@Component
@OnCreateValidation
class CompartmentMovementWalletValidator : CompartmentMovementValidator {

    override fun validate(value: CompartmentMovement) {
        if (!value.compartment.wallet.active) {
            throw DomainException("The wallet of the compartment is not active", INACTIVE_WALLET)
        }
    }
}
