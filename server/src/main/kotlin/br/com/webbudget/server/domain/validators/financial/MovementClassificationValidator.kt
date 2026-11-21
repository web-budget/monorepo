package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.CLASSIFICATION_TYPE_MISMATCH
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_CLASSIFICATION
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_COST_CENTER
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

@Component
@OnCreateValidation
@OnUpdateValidation
class MovementClassificationValidator : MovementValidator {

    override fun validate(value: Movement) {

        if (value.classification.type != value.type.name) {
            throw DomainException("The classification must have the same type of the movement", CLASSIFICATION_TYPE_MISMATCH)
        }

        if (!value.classification.active) {
            throw DomainException("The classification of the movement is not active", INACTIVE_CLASSIFICATION)
        }

        if (!value.costCenter.active) {
            throw DomainException("The cost center of the movement is not active", INACTIVE_COST_CENTER)
        }
    }
}
