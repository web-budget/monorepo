package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.PeriodDashboard
import br.com.webbudget.server.jooq.financial.tables.references.CARD_PURCHASES
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Repository
class PeriodDashboardRepository(
    private val dsl: DSLContext
) {

    class WindowPeriod(val id: Long, val externalId: UUID, val name: String)

    class CardInvoice(
        val cardId: Long,
        val cardExternalId: UUID,
        val cardName: String,
        val lastFourDigits: String,
        val invoiceExternalId: UUID,
        val invoiceStatus: Invoice.Status,
        val financialPeriodId: Long,
        val purchases: BigDecimal
    )

    private val periods = FINANCIAL_PERIODS.`as`("financial_periods")
    private val movements = MOVEMENTS.`as`("movements")
    private val invoices = INVOICES.`as`("invoices")
    private val purchases = CARD_PURCHASES.`as`("card_purchases")
    private val cards = CARDS.`as`("cards")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val parents = COST_CENTERS.`as`("parents")

    fun findByExternalId(externalId: UUID): PeriodDashboard.Period? = dsl.select()
        .from(periods)
        .where(periods.EXTERNAL_ID.eq(externalId))
        .fetchOne { record -> record.toPeriod() }

    fun findCurrent(today: LocalDate): PeriodDashboard.Period? {

        val isOpen = DSL.field(periods.STATUS.eq(OPEN))
        val includesToday = DSL.field(periods.STARTING_AT.le(today).and(periods.ENDING_AT.ge(today)))

        return dsl.select()
            .from(periods)
            .orderBy(isOpen.desc(), includesToday.desc(), periods.ENDING_AT.desc(), periods.ID.desc())
            .limit(1)
            .fetchOne { record -> record.toPeriod() }
    }

    fun findCostCenters(): List<PeriodDashboard.CostCenterNode> = dsl.select()
        .from(costCenters)
        .leftJoin(parents).on(parents.ID.eq(costCenters.ID_PARENT))
        .fetch { record ->
            val costCenter = record.into(costCenters)
            PeriodDashboard.CostCenterNode(
                id = costCenter.id!!,
                externalId = costCenter.externalId!!,
                name = costCenter.name!!,
                parentId = costCenter.idParent,
                parentExternalId = record.get(parents.EXTERNAL_ID),
                expenseBudget = costCenter.expenseBudget,
                incomeBudget = costCenter.incomeBudget
            )
        }

    fun findUpcoming(until: LocalDate, today: LocalDate): List<PeriodDashboard.UpcomingItem> = dsl.select()
        .from(movements)
        .join(periods).on(periods.ID.eq(movements.ID_FINANCIAL_PERIOD))
        .where(movements.STATUS.eq(Movement.Status.OPEN.name))
        .and(periods.STATUS.eq(OPEN))
        .and(movements.DUE_DATE.le(until))
        .orderBy(movements.DUE_DATE, movements.ID)
        .fetch { record ->
            val movement = record.into(movements)
            val period = record.into(periods)
            PeriodDashboard.UpcomingItem(
                id = movement.externalId!!,
                name = movement.name!!,
                type = Movement.Type.valueOf(movement.type!!),
                value = movement.value!!,
                dueDate = movement.dueDate!!,
                financialPeriodId = period.externalId!!,
                financialPeriodName = period.name!!,
                invoicePayment = movement.idInvoice != null,
                overdue = movement.dueDate!!.isBefore(today)
            )
        }

    fun findWindow(until: LocalDate, size: Int): List<WindowPeriod> = dsl
        .select(periods.ID, periods.EXTERNAL_ID, periods.NAME)
        .from(periods)
        .where(periods.ENDING_AT.le(until))
        .orderBy(periods.ENDING_AT.desc(), periods.ID.desc())
        .limit(size)
        .fetch { record -> WindowPeriod(record.value1()!!, record.value2()!!, record.value3()!!) }
        .reversed()

    fun findCardInvoices(financialPeriodIds: Collection<Long>): List<CardInvoice> {

        val total = DSL.coalesce(DSL.sum(purchases.VALUE), BigDecimal.ZERO)

        return dsl
            .select(
                cards.ID,
                cards.EXTERNAL_ID,
                cards.NAME,
                cards.LAST_FOUR_DIGITS,
                invoices.EXTERNAL_ID,
                invoices.STATUS,
                invoices.ID_FINANCIAL_PERIOD,
                total
            )
            .from(invoices)
            .join(cards).on(cards.ID.eq(invoices.ID_CARD))
            .leftJoin(purchases).on(purchases.ID_INVOICE.eq(invoices.ID))
            .where(invoices.ID_FINANCIAL_PERIOD.`in`(financialPeriodIds))
            .groupBy(cards.ID, cards.EXTERNAL_ID, cards.NAME, cards.LAST_FOUR_DIGITS, invoices.ID, invoices.EXTERNAL_ID, invoices.STATUS, invoices.ID_FINANCIAL_PERIOD)
            .orderBy(cards.NAME, cards.ID)
            .fetch { record ->
                CardInvoice(
                    cardId = record.value1()!!,
                    cardExternalId = record.value2()!!,
                    cardName = record.value3()!!,
                    lastFourDigits = record.value4()!!,
                    invoiceExternalId = record.value5()!!,
                    invoiceStatus = Invoice.Status.valueOf(record.value6()!!),
                    financialPeriodId = record.value7()!!,
                    purchases = record.value8()
                )
            }
    }

    private fun Record.toPeriod(): PeriodDashboard.Period {

        val record = into(periods)

        return PeriodDashboard.Period(
            financialPeriod = record.toFinancialPeriodReference(),
            revenuesGoal = record.revenuesGoal,
            expensesGoal = record.expensesGoal
        )
    }

    companion object {
        private const val OPEN = "OPEN"
    }
}
