package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.MovementClassificationView
import br.com.webbudget.server.application.payloads.financial.MovementCostCenterView
import br.com.webbudget.server.application.payloads.financial.MovementFinancialPeriodView
import br.com.webbudget.server.domain.entities.financial.ClassificationReference
import br.com.webbudget.server.domain.entities.financial.CostCenterReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class MovementReferenceMapper(
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun mapToView(classification: ClassificationReference) = MovementClassificationView(
        id = classification.externalId,
        name = classification.name,
        type = classification.type,
        active = classification.active,
        budget = classification.budget
    )

    fun mapToView(costCenter: CostCenterReference) = MovementCostCenterView(
        id = costCenter.externalId,
        name = costCenter.name,
        fullName = costCenter.fullName,
        active = costCenter.active,
        incomeBudget = costCenter.incomeBudget,
        expenseBudget = costCenter.expenseBudget
    )

    fun mapToView(financialPeriod: FinancialPeriodReference) = MovementFinancialPeriodView(
        id = financialPeriod.externalId,
        name = financialPeriod.name,
        startingAt = financialPeriod.startingAt,
        endingAt = financialPeriod.endingAt,
        status = financialPeriod.status.name
    )

    fun findClassification(externalId: UUID): ClassificationReference =
        movementReferenceRepository.findClassification(externalId) ?: throw ResourceNotFoundException()

    fun findCostCenter(externalId: UUID): CostCenterReference =
        movementReferenceRepository.findCostCenter(externalId) ?: throw ResourceNotFoundException()

    fun findFinancialPeriod(externalId: UUID): FinancialPeriodReference =
        movementReferenceRepository.findFinancialPeriod(externalId) ?: throw ResourceNotFoundException()
}
