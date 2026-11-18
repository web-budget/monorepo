package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.RECURRING_MOVEMENT_NOT_ACTIVE
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
class RecurringMovementStateValidator(
    private val recurringMovementRepository: RecurringMovementRepository
) : RecurringMovementValidator {

    override fun validate(value: RecurringMovement) {
        if (recurringMovementRepository.existsByExternalIdAndState(value.externalId!!, RecurringMovement.State.ENDED)) {
            throw DomainException("Recurring movement isn't active", RECURRING_MOVEMENT_NOT_ACTIVE)
        }
    }
}
