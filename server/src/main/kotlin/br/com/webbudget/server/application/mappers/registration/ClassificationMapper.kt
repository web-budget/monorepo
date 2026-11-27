package br.com.webbudget.server.application.mappers.registration

import br.com.webbudget.server.application.payloads.registration.ClassificationCreateForm
import br.com.webbudget.server.application.payloads.registration.ClassificationListView
import br.com.webbudget.server.application.payloads.registration.ClassificationUpdateForm
import br.com.webbudget.server.application.payloads.registration.ClassificationView
import br.com.webbudget.server.domain.entities.registration.Classification
import org.springframework.stereotype.Component

@Component
class ClassificationMapper {

    fun mapToView(classification: Classification): ClassificationView = ClassificationView(
        id = classification.externalId!!,
        name = classification.name,
        type = classification.type.name,
        active = classification.active,
        generic = classification.generic,
        description = classification.description
    )

    fun mapToListView(classification: Classification): ClassificationListView = ClassificationListView(
        id = classification.externalId!!,
        name = classification.name,
        type = classification.type.name,
        active = classification.active,
        generic = classification.generic
    )

    fun mapToDomain(form: ClassificationCreateForm): Classification = Classification(
        name = form.name!!,
        type = form.type!!,
        description = form.description,
        generic = form.generic ?: false
    )

    fun mapToDomain(form: ClassificationUpdateForm, classification: Classification): Classification =
        classification.apply {
            this.name = form.name!!
            this.description = form.description
            this.active = form.active!!
            this.generic = form.generic ?: false
        }
}
