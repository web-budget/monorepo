package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_PARENT_COST_CENTER
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.registration.CostCenterRepository
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
class CostCenterParentValidator(
    private val costCenterRepository: CostCenterRepository
) : CostCenterValidator {

    override fun validate(value: CostCenter) {

        val parentId = value.parent?.id ?: return

        val visited = mutableSetOf<Long>()
        var ancestorId: Long? = parentId

        while (ancestorId != null && visited.add(ancestorId)) {
            if (ancestorId == value.id) {
                throw DomainException("A cost center can not be its own ancestor", INVALID_PARENT_COST_CENTER)
            }
            ancestorId = costCenterRepository.findParentId(ancestorId)
        }
    }
}
