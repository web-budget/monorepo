package br.com.webbudget.server.domain.services.registration

import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.registration.CostCenterValidator
import br.com.webbudget.server.infrastructure.repository.registration.CostCenterRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class CostCenterService(
    private val costCenterRepository: CostCenterRepository,
    @OnCreateValidation
    private val creationValidators: List<CostCenterValidator>,
    @OnUpdateValidation
    private val updateValidators: List<CostCenterValidator>
) {

    @Transactional
    fun create(costCenter: CostCenter): UUID {

        costCenter.updateFullName()

        creationValidators.forEach { it.validate(costCenter) }

        return costCenterRepository.insert(costCenter).externalId!!
    }

    @Transactional
    fun update(costCenter: CostCenter): CostCenter {

        costCenter.updateFullName()

        updateValidators.forEach { it.validate(costCenter) }

        val updated = costCenterRepository.update(costCenter)
        updateChildrenFullName(updated)

        return updated
    }

    @Transactional
    fun delete(costCenter: CostCenter) {
        costCenterRepository.delete(costCenter)
    }

    private fun updateChildrenFullName(parent: CostCenter) {
        costCenterRepository.findChildren(parent).forEach { child ->
            child.updateFullName()
            costCenterRepository.update(child)
            updateChildrenFullName(child)
        }
    }
}
