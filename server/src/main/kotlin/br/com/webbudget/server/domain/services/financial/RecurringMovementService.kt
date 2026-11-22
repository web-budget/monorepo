package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.financial.RecurringMovementValidator
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service
@Transactional(readOnly = true)
class RecurringMovementService(
    private val recurringMovementRepository: RecurringMovementRepository,
    @OnCreateValidation
    private val creationValidators: List<RecurringMovementValidator>,
    @OnUpdateValidation
    private val updateValidators: List<RecurringMovementValidator>,
    @OnDeleteValidation
    private val deletionValidators: List<RecurringMovementValidator>
) {

    @Transactional
    fun create(recurringMovement: RecurringMovement): UUID {

        creationValidators.forEach { it.validate(recurringMovement) }

        return recurringMovementRepository.insert(recurringMovement).externalId!!
    }

    @Transactional
    fun update(recurringMovement: RecurringMovement): RecurringMovement {

        updateValidators.forEach { it.validate(recurringMovement) }

        return recurringMovementRepository.update(recurringMovement)
    }

    @Transactional
    fun changeValue(recurringMovement: RecurringMovement, value: BigDecimal, reason: String?): RecurringMovement {

        recurringMovementRepository.insertValue(recurringMovement.id!!, value, reason)

        recurringMovement.value = value

        return recurringMovement
    }

    @Transactional
    fun delete(recurringMovement: RecurringMovement) {

        deletionValidators.forEach { it.validate(recurringMovement) }

        recurringMovementRepository.delete(recurringMovement)
    }
}
