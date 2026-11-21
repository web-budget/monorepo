package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.registration.CostCenterRepository
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
@OnCreateValidation
class CostCenterNameValidator(
    private val costCenterRepository: CostCenterRepository
) : CostCenterValidator {

    override fun validate(value: CostCenter) {

        if (existsWithSameName(value)) {
            throw DomainException.conflict(parameters = mapOf("cost-center.name" to value.name))
        }
    }

    private fun existsWithSameName(value: CostCenter): Boolean =
        if (value.parent != null) {
            costCenterRepository.existsByFullName(value.fullName, value.externalId)
        } else {
            costCenterRepository.existsByName(value.name, value.externalId)
        }
}
