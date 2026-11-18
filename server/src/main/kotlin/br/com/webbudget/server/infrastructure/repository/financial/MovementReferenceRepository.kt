package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.ClassificationReference
import br.com.webbudget.server.domain.entities.financial.CostCenterReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class MovementReferenceRepository(
    private val dsl: DSLContext
) {

    fun findClassification(externalId: UUID): ClassificationReference? {
        val classifications = CLASSIFICATIONS.`as`("classifications")
        return dsl.selectFrom(classifications)
            .where(classifications.EXTERNAL_ID.eq(externalId))
            .fetchOne()
            ?.toClassificationReference()
    }

    fun findCostCenter(externalId: UUID): CostCenterReference? {
        val costCenters = COST_CENTERS.`as`("cost_centers")
        return dsl.selectFrom(costCenters)
            .where(costCenters.EXTERNAL_ID.eq(externalId))
            .fetchOne()
            ?.toCostCenterReference()
    }

    fun findFinancialPeriod(externalId: UUID): FinancialPeriodReference? {
        val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
        return dsl.selectFrom(financialPeriods)
            .where(financialPeriods.EXTERNAL_ID.eq(externalId))
            .fetchOne()
            ?.toFinancialPeriodReference()
    }
}
