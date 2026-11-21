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
        description = classification.description
    )

    fun mapToListView(classification: Classification): ClassificationListView = ClassificationListView(
        id = classification.externalId!!,
        name = classification.name,
        type = classification.type.name,
        active = classification.active
    )

    fun mapToDomain(form: ClassificationCreateForm): Classification = Classification(
        name = form.name!!,
        type = form.type!!,
        description = form.description
    )

    fun mapToDomain(form: ClassificationUpdateForm, classification: Classification): Classification =
        classification.apply {
            this.name = form.name!!
            this.description = form.description
            this.active = form.active!!
        }
}
