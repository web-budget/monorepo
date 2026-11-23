package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.CardReference
import br.com.webbudget.server.domain.entities.financial.ClassificationReference
import br.com.webbudget.server.domain.entities.financial.CostCenterReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.WalletReference
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDate
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

    fun findFinancialPeriod(id: Long): FinancialPeriodReference? {
        val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
        return dsl.selectFrom(financialPeriods)
            .where(financialPeriods.ID.eq(id))
            .fetchOne()
            ?.toFinancialPeriodReference()
    }

    fun findNextOpenFinancialPeriod(endingAt: LocalDate): FinancialPeriodReference? {
        val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
        return dsl.selectFrom(financialPeriods)
            .where(financialPeriods.STATUS.eq(FinancialPeriodReference.Status.OPEN.name))
            .and(financialPeriods.STARTING_AT.gt(endingAt))
            .orderBy(financialPeriods.STARTING_AT)
            .limit(1)
            .fetchOne()
            ?.toFinancialPeriodReference()
    }

    fun findOpenFinancialPeriodsExcept(id: Long): List<FinancialPeriodReference> {
        val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
        return dsl.selectFrom(financialPeriods)
            .where(financialPeriods.STATUS.eq(FinancialPeriodReference.Status.OPEN.name))
            .and(financialPeriods.ID.ne(id))
            .orderBy(financialPeriods.STARTING_AT)
            .fetch { record -> record.toFinancialPeriodReference() }
    }

    fun findWallet(externalId: UUID): WalletReference? {
        val wallets = WALLETS.`as`("wallets")
        return dsl.selectFrom(wallets)
            .where(wallets.EXTERNAL_ID.eq(externalId))
            .fetchOne()
            ?.toWalletReference()
    }

    fun findCard(externalId: UUID): CardReference? {
        val cards = CARDS.`as`("cards")
        return dsl.selectFrom(cards)
            .where(cards.EXTERNAL_ID.eq(externalId))
            .fetchOne()
            ?.toCardReference()
    }
}
