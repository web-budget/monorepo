package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.CARD_RECURRING_MUST_BE_EXPENSE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.CLASSIFICATION_TYPE_MISMATCH
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_CARD
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_CLASSIFICATION
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_COST_CENTER
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_INSTALLMENTS
import br.com.webbudget.server.domain.exceptions.ErrorCodes.RECURRING_MOVEMENT_WITH_LAUNCHES
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

interface RecurringMovementValidator : BusinessValidator<RecurringMovement>

@Component
@OnCreateValidation
@OnUpdateValidation
class RecurringMovementClassificationValidator : RecurringMovementValidator {

    override fun validate(value: RecurringMovement) {

        if (value.classification.type != value.type.name) {
            throw DomainException("The classification must have the same type of the recurring movement", CLASSIFICATION_TYPE_MISMATCH)
        }

        if (!value.active) {
            return
        }

        if (!value.classification.active) {
            throw DomainException("The classification of the recurring movement is not active", INACTIVE_CLASSIFICATION)
        }

        if (!value.costCenter.active) {
            throw DomainException("The cost center of the recurring movement is not active", INACTIVE_COST_CENTER)
        }
    }
}

@Component
@OnCreateValidation
@OnUpdateValidation
class RecurringMovementInstallmentsValidator : RecurringMovementValidator {

    override fun validate(value: RecurringMovement) {

        val installments = value.installments ?: return

        if (value.firstInstallment > installments) {
            throw DomainException("The first installment is after the last one", INVALID_INSTALLMENTS)
        }

        if (installments < (value.launchedInstallments ?: 0)) {
            throw DomainException("The recurring movement already launched more installments", INVALID_INSTALLMENTS)
        }
    }
}

@Component
@OnDeleteValidation
class RecurringMovementLaunchesValidator : RecurringMovementValidator {

    override fun validate(value: RecurringMovement) {
        if (value.launchedInstallments != null) {
            throw DomainException("The recurring movement already has launches", RECURRING_MOVEMENT_WITH_LAUNCHES)
        }
    }
}

@Component
@OnCreateValidation
@OnUpdateValidation
class RecurringMovementCardValidator : RecurringMovementValidator {

    override fun validate(value: RecurringMovement) {

        val card = value.card ?: return

        if (value.type != Movement.Type.EXPENSE) {
            throw DomainException("Only an expense can have a card", CARD_RECURRING_MUST_BE_EXPENSE)
        }

        if (value.active && !card.active) {
            throw DomainException("The card of the recurring movement is not active", INACTIVE_CARD)
        }
    }
}
