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

        val conflicting = if (value.isSaved()) {
            existsOtherWithSameName(value)
        } else {
            existsWithSameName(value)
        }

        if (conflicting) {
            throw DomainException.conflict(parameters = mapOf("cost-center.name" to value.name))
        }
    }

    private fun existsOtherWithSameName(value: CostCenter): Boolean =
        if (value.parent != null) {
            costCenterRepository.existsByFullNameAndExternalIdNot(value.fullName, value.externalId!!)
        } else {
            costCenterRepository.existsByNameAndExternalIdNot(value.name, value.externalId!!)
        }

    private fun existsWithSameName(value: CostCenter): Boolean =
        if (value.parent != null) {
            costCenterRepository.existsByFullName(value.fullName)
        } else {
            costCenterRepository.existsByName(value.name)
        }
}
