package br.com.webbudget.server.domain.services.registration

import br.com.webbudget.server.domain.entities.registration.Classification
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.registration.ClassificationValidator
import br.com.webbudget.server.infrastructure.repository.registration.ClassificationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class ClassificationService(
    private val classificationRepository: ClassificationRepository,
    @OnCreateValidation
    private val creationValidators: List<ClassificationValidator>,
    @OnUpdateValidation
    private val updateValidators: List<ClassificationValidator>
) {

    @Transactional
    fun create(classification: Classification): UUID {

        creationValidators.forEach { it.validate(classification) }

        return classificationRepository.insert(classification).externalId!!
    }

    @Transactional
    fun update(classification: Classification): Classification {

        updateValidators.forEach { it.validate(classification) }

        return classificationRepository.update(classification)
    }

    @Transactional
    fun delete(classification: Classification) {
        classificationRepository.delete(classification)
    }
}
