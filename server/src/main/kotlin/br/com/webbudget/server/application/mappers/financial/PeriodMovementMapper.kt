package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.PeriodMovementCreateForm
import br.com.webbudget.server.application.payloads.financial.PeriodMovementListView
import br.com.webbudget.server.application.payloads.financial.PeriodMovementUpdateForm
import br.com.webbudget.server.application.payloads.financial.PeriodMovementView
import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import org.springframework.stereotype.Component

@Component
class PeriodMovementMapper(
    private val movementReferenceMapper: MovementReferenceMapper
) {

    fun mapToView(periodMovement: PeriodMovement) = PeriodMovementView(
        id = periodMovement.externalId!!,
        name = periodMovement.name,
        dueDate = periodMovement.dueDate,
        value = periodMovement.value,
        state = periodMovement.state.name,
        classification = movementReferenceMapper.mapToView(periodMovement.classification),
        costCenter = movementReferenceMapper.mapToView(periodMovement.costCenter),
        financialPeriod = movementReferenceMapper.mapToView(periodMovement.financialPeriod),
        quoteNumber = periodMovement.quoteNumber,
        description = periodMovement.description
    )

    fun mapToListView(periodMovement: PeriodMovement) = PeriodMovementListView(
        id = periodMovement.externalId!!,
        name = periodMovement.name,
        dueDate = periodMovement.dueDate,
        value = periodMovement.value,
        state = periodMovement.state.name,
        financialPeriod = movementReferenceMapper.mapToView(periodMovement.financialPeriod)
    )

    fun mapToDomain(form: PeriodMovementCreateForm): PeriodMovement = PeriodMovement(
        name = form.name!!,
        dueDate = form.dueDate!!,
        value = form.value!!,
        classification = movementReferenceMapper.findClassification(form.classification!!),
        costCenter = movementReferenceMapper.findCostCenter(form.costCenter!!),
        financialPeriod = movementReferenceMapper.findFinancialPeriod(form.financialPeriod!!),
        description = form.description
    )

    fun mapToDomain(form: PeriodMovementUpdateForm, periodMovement: PeriodMovement): PeriodMovement =
        periodMovement.apply {
            this.name = form.name!!
            this.dueDate = form.dueDate!!
            this.value = form.value!!
            this.financialPeriod = movementReferenceMapper.findFinancialPeriod(form.financialPeriod!!)
            this.classification = movementReferenceMapper.findClassification(form.classification!!)
            this.costCenter = movementReferenceMapper.findCostCenter(form.costCenter!!)
            this.description = form.description
        }
}
