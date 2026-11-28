package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.CardReference
import br.com.webbudget.server.domain.entities.financial.ClassificationReference
import br.com.webbudget.server.domain.entities.financial.CompartmentBalance
import br.com.webbudget.server.domain.entities.financial.CompartmentReference
import br.com.webbudget.server.domain.entities.financial.CostCenterReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.ImportCompartment
import br.com.webbudget.server.domain.entities.financial.WalletBalances
import br.com.webbudget.server.domain.entities.financial.WalletReference
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COMPARTMENTS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import br.com.webbudget.server.jooq.registration.tables.references.WALLET_TOTALS
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

    fun findFinancialPeriodsEndingBetween(from: LocalDate, to: LocalDate): List<FinancialPeriodReference> {
        val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
        return dsl.selectFrom(financialPeriods)
            .where(financialPeriods.ENDING_AT.between(from, to))
            .orderBy(financialPeriods.ENDING_AT, financialPeriods.STARTING_AT)
            .fetch { record -> record.toFinancialPeriodReference() }
    }

    fun findOpenFinancialPeriods(): List<FinancialPeriodReference> {
        val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
        return dsl.selectFrom(financialPeriods)
            .where(financialPeriods.STATUS.eq(FinancialPeriodReference.Status.OPEN.name))
            .orderBy(financialPeriods.STARTING_AT)
            .fetch { record -> record.toFinancialPeriodReference() }
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

    fun findWalletBalances(walletId: Long): WalletBalances {
        val wallets = WALLETS.`as`("wallets")
        val totals = WALLET_TOTALS.`as`("wallet_totals")
        val compartments = COMPARTMENTS.`as`("compartments")
        val records = dsl.select(
            wallets.CURRENT_BALANCE,
            totals.TOTAL_BALANCE,
            compartments.EXTERNAL_ID,
            compartments.NAME,
            compartments.BALANCE
        )
            .from(wallets)
            .join(totals).on(totals.ID_WALLET.eq(wallets.ID))
            .leftJoin(compartments).on(compartments.ID_WALLET.eq(wallets.ID))
            .where(wallets.ID.eq(walletId))
            .orderBy(compartments.CREATED_ON.asc(), compartments.ID.asc())
            .fetch()

        val first = records.first()

        return WalletBalances(
            freeBalance = first.get(wallets.CURRENT_BALANCE)!!,
            totalBalance = first.get(totals.TOTAL_BALANCE)!!,
            compartments = records.filter { it.get(compartments.EXTERNAL_ID) != null }.map { record ->
                CompartmentBalance(
                    id = record.get(compartments.EXTERNAL_ID)!!,
                    name = record.get(compartments.NAME)!!,
                    balance = record.get(compartments.BALANCE)!!
                )
            }
        )
    }

    fun findImportCompartment(externalId: UUID): ImportCompartment? = dsl.selectFrom(COMPARTMENTS)
        .where(COMPARTMENTS.EXTERNAL_ID.eq(externalId))
        .fetchOne { record ->
            ImportCompartment(
                id = record.id!!,
                externalId = record.externalId!!,
                name = record.name!!,
                balance = record.balance!!,
                walletId = record.idWallet!!
            )
        }

    fun findCompartment(walletExternalId: UUID, compartmentExternalId: UUID): CompartmentReference? {
        val compartments = COMPARTMENTS.`as`("compartments")
        val wallets = WALLETS.`as`("wallets")
        return dsl.select(compartments.asterisk(), wallets.asterisk())
            .from(compartments)
            .join(wallets).on(wallets.ID.eq(compartments.ID_WALLET))
            .where(wallets.EXTERNAL_ID.eq(walletExternalId))
            .and(compartments.EXTERNAL_ID.eq(compartmentExternalId))
            .fetchOne { record ->
                val compartment = record.into(compartments)
                CompartmentReference(
                    id = compartment.id!!,
                    externalId = compartment.externalId!!,
                    name = compartment.name!!,
                    balance = compartment.balance!!,
                    wallet = record.into(wallets).toWalletReference()
                )
            }
    }

    fun findCard(externalId: UUID): CardReference? {
        val cards = CARDS.`as`("cards")
        return dsl.selectFrom(cards)
            .where(cards.EXTERNAL_ID.eq(externalId))
            .fetchOne()
            ?.toCardReference()
    }
}
