package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.Classification
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.registration.ClassificationRepository
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
@OnCreateValidation
class ClassificationNameValidator(
    private val classificationRepository: ClassificationRepository
) : ClassificationValidator {

    override fun validate(value: Classification) {
        if (classificationRepository.existsByName(value.name, value.externalId)) {
            throw DomainException.conflict(parameters = mapOf("classification.name" to value.name))
        }
    }
}
