package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.financial.RecurringMovementValidator
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class RecurringMovementService(
    private val recurringMovementRepository: RecurringMovementRepository,
    @OnUpdateValidation
    private val updateValidators: List<RecurringMovementValidator>
) {

    @Transactional
    fun create(recurringMovement: RecurringMovement): UUID =
        recurringMovementRepository.insert(recurringMovement).externalId!!

    @Transactional
    fun update(recurringMovement: RecurringMovement): RecurringMovement {

        updateValidators.forEach { it.validate(recurringMovement) }

        return recurringMovementRepository.update(recurringMovement)
    }

    @Transactional
    fun delete(recurringMovement: RecurringMovement) {
        recurringMovementRepository.delete(recurringMovement)
    }
}
