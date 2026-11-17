package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.financial.PeriodMovementValidator
import br.com.webbudget.server.infrastructure.repository.financial.PeriodMovementRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class PeriodMovementService(
    private val periodMovementRepository: PeriodMovementRepository,
    @OnCreateValidation
    private val creationValidators: List<PeriodMovementValidator>,
    @OnUpdateValidation
    private val updateValidators: List<PeriodMovementValidator>,
    @OnDeleteValidation
    private val deletionValidators: List<PeriodMovementValidator>
) {

    @Transactional
    fun create(periodMovement: PeriodMovement): UUID {

        creationValidators.forEach { it.validate(periodMovement) }

        return periodMovementRepository.insert(periodMovement).externalId!!
    }

    @Transactional
    fun update(periodMovement: PeriodMovement): PeriodMovement {

        updateValidators.forEach { it.validate(periodMovement) }

        return periodMovementRepository.update(periodMovement)
    }

    @Transactional
    fun delete(periodMovement: PeriodMovement) {

        deletionValidators.forEach { it.validate(periodMovement) }

        periodMovementRepository.delete(periodMovement)
    }
}
