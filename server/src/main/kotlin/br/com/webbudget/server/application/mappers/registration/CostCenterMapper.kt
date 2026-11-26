package br.com.webbudget.server.application.mappers.registration

import br.com.webbudget.server.application.payloads.registration.CostCenterCreateForm
import br.com.webbudget.server.application.payloads.registration.CostCenterListView
import br.com.webbudget.server.application.payloads.registration.CostCenterUpdateForm
import br.com.webbudget.server.application.payloads.registration.CostCenterView
import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.registration.CostCenterRepository
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class CostCenterMapper(
    private val costCenterRepository: CostCenterRepository
) {

    fun mapToView(costCenter: CostCenter): CostCenterView = CostCenterView(
        id = costCenter.externalId!!,
        name = costCenter.name,
        active = costCenter.active,
        description = costCenter.description,
        expenseBudgetPercentage = costCenter.expenseBudgetPercentage,
        parentCostCenter = costCenter.parent?.let { mapToListView(it) }
    )

    fun mapToListView(costCenter: CostCenter): CostCenterListView = CostCenterListView(
        id = costCenter.externalId!!,
        name = costCenter.name,
        fullName = costCenter.fullName,
        active = costCenter.active,
        expenseBudgetPercentage = costCenter.expenseBudgetPercentage
    )

    fun mapToDomain(form: CostCenterCreateForm): CostCenter = CostCenter(
        name = form.name!!,
        fullName = form.name,
        description = form.description,
        expenseBudgetPercentage = form.expenseBudgetPercentage,
        parent = form.parentCostCenter?.let { mapParent(it) }
    )

    fun mapToDomain(form: CostCenterUpdateForm, costCenter: CostCenter): CostCenter = costCenter.apply {
        this.name = form.name!!
        this.active = form.active!!
        this.description = form.description
        this.expenseBudgetPercentage = form.expenseBudgetPercentage
        this.parent = form.parentCostCenter?.let { mapParent(it) }
    }

    private fun mapParent(parentId: UUID): CostCenter = costCenterRepository.findByExternalId(parentId)
        ?: throw ResourceNotFoundException()
}
