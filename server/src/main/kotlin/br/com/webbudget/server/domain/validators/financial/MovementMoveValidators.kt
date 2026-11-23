package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.MovementMove
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVOICE_PAYMENT_MOVED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.MOVE_TARGET_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.MOVE_TARGET_SAME_PERIOD
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnMoveValidation
import org.springframework.stereotype.Component

interface MovementMoveValidator : BusinessValidator<MovementMove>

@Component
@OnMoveValidation
class MovementMoveTargetOpenValidator : MovementMoveValidator {

    override fun validate(value: MovementMove) {
        if (!value.target.isOpen()) {
            throw DomainException("The target financial period is not open", MOVE_TARGET_NOT_OPEN)
        }
    }
}

@Component
@OnMoveValidation
class MovementMoveTargetDifferentValidator : MovementMoveValidator {

    override fun validate(value: MovementMove) {
        if (value.target.id == value.movement.financialPeriod.id) {
            throw DomainException("The movement is already in the target financial period", MOVE_TARGET_SAME_PERIOD)
        }
    }
}

@Component
@OnDeleteValidation
class MovementInvoicePaymentMovedValidator : MovementValidator {

    override fun validate(value: Movement) {
        val invoice = value.invoice ?: return

        if (invoice.financialPeriod.id != value.financialPeriod.id) {
            throw DomainException("A moved invoice payment can not be deleted", INVOICE_PAYMENT_MOVED)
        }
    }
}
