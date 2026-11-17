package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.RecurringMovementCreateForm
import br.com.webbudget.server.application.payloads.financial.RecurringMovementListView
import br.com.webbudget.server.application.payloads.financial.RecurringMovementUpdateForm
import br.com.webbudget.server.application.payloads.financial.RecurringMovementView
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import org.springframework.stereotype.Component

@Component
class RecurringMovementMapper(
    private val movementReferenceMapper: MovementReferenceMapper
) {

    fun mapToView(recurringMovement: RecurringMovement) = RecurringMovementView(
        id = recurringMovement.externalId!!,
        name = recurringMovement.name,
        value = recurringMovement.value,
        startingAt = recurringMovement.startingAt,
        state = recurringMovement.state.name,
        autoLaunch = recurringMovement.autoLaunch,
        indeterminate = recurringMovement.indeterminate,
        totalQuotes = recurringMovement.totalQuotes,
        startingQuote = recurringMovement.startingQuote,
        currentQuote = recurringMovement.currentQuote,
        description = recurringMovement.description,
        classification = movementReferenceMapper.mapToView(recurringMovement.classification),
        costCenter = movementReferenceMapper.mapToView(recurringMovement.costCenter)
    )

    fun mapToListView(recurringMovement: RecurringMovement) = RecurringMovementListView(
        id = recurringMovement.externalId!!,
        name = recurringMovement.name,
        value = recurringMovement.value,
        state = recurringMovement.state.name,
        autoLaunch = recurringMovement.autoLaunch,
        indeterminate = recurringMovement.indeterminate,
        totalQuotes = recurringMovement.totalQuotes,
        currentQuote = recurringMovement.currentQuote
    )

    fun mapToDomain(form: RecurringMovementCreateForm): RecurringMovement = RecurringMovement(
        name = form.name!!,
        value = form.value!!,
        startingAt = form.startingAt!!,
        autoLaunch = form.autoLaunch!!,
        classification = movementReferenceMapper.findClassification(form.classification!!),
        costCenter = movementReferenceMapper.findCostCenter(form.costCenter!!),
        indeterminate = form.indeterminate!!,
        totalQuotes = form.totalQuotes,
        startingQuote = form.startingQuote,
        currentQuote = form.currentQuote,
        description = form.description
    )

    fun mapToDomain(form: RecurringMovementUpdateForm, recurringMovement: RecurringMovement): RecurringMovement =
        recurringMovement.apply {
            this.name = form.name!!
            this.classification = movementReferenceMapper.findClassification(form.classification!!)
            this.costCenter = movementReferenceMapper.findCostCenter(form.costCenter!!)
            this.startingAt = form.startingAt!!
            this.autoLaunch = form.autoLaunch!!
            this.description = form.description
        }
}
