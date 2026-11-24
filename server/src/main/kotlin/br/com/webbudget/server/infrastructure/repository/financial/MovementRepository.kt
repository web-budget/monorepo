package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.domain.entities.financial.RecurringMovementReference
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.containsIgnoringAccents
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.PAYMENTS
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_LAUNCHES
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_MOVEMENTS
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.SelectJoinStep
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Repository
class MovementRepository(
    private val dsl: DSLContext
) {

    private val movements = MOVEMENTS.`as`("movements")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
    private val payments = PAYMENTS.`as`("payments")
    private val wallets = WALLETS.`as`("wallets")
    private val cards = CARDS.`as`("cards")
    private val invoices = INVOICES.`as`("invoices")
    private val invoiceCards = CARDS.`as`("invoice_cards")
    private val recurringLaunches = RECURRING_LAUNCHES.`as`("recurring_launches")
    private val recurringMovements = RECURRING_MOVEMENTS.`as`("recurring_movements")
    private val recurringCards = CARDS.`as`("recurring_cards")

    fun findByExternalId(externalId: UUID): Movement? = selectJoined()
        .where(movements.EXTERNAL_ID.eq(externalId))
        .fetchOne()
        ?.toMovement()

    fun findAll(filter: MovementCriteria, today: LocalDate, pageable: Pageable): PagedModel<Movement> {

        val overdue = movements.STATUS.eq(Movement.Status.OPEN.name).and(movements.DUE_DATE.lt(today))

        val condition = DSL.and(
            listOfNotNull(
                filter.text?.let { text ->
                    DSL.or(
                        movements.NAME.containsIgnoringAccents(text),
                        costCenters.NAME.containsIgnoringAccents(text),
                        classifications.NAME.containsIgnoringAccents(text)
                    )
                },
                filter.type?.let { type -> movements.TYPE.eq(type.name) },
                filter.statuses?.takeIf { it.isNotEmpty() }
                    ?.let { statuses -> movements.STATUS.`in`(statuses.map(Movement.Status::name)) },
                filter.overdue?.let { requested -> if (requested) overdue else DSL.not(overdue) },
                filter.classification?.let { classifications.EXTERNAL_ID.eq(it) },
                filter.costCenter?.let { costCenters.EXTERNAL_ID.eq(it) },
                filter.financialPeriods?.takeIf { it.isNotEmpty() }?.let { financialPeriods.EXTERNAL_ID.`in`(it) },
                filter.dueFrom?.let { movements.DUE_DATE.ge(it) },
                filter.dueTo?.let { movements.DUE_DATE.le(it) },
                filter.invoicePayments?.let { requested -> if (requested) movements.ID_INVOICE.isNotNull else movements.ID_INVOICE.isNull }
            )
        )

        val sortable = mapOf(
            "name" to movements.NAME,
            "dueDate" to movements.DUE_DATE,
            "costCenter" to costCenters.NAME,
            "value" to movements.VALUE,
            "status" to movements.STATUS,
            "createdOn" to movements.CREATED_ON
        )

        val content = selectJoined()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, movements.CREATED_ON, movements.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toMovement() }

        val total = dsl.fetchCount(dsl.selectOne().from(movements).joinReferences().where(condition))

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun sumPaidValueByType(financialPeriodId: Long): Map<Movement.Type, BigDecimal> = dsl
        .select(movements.TYPE, DSL.sum(payments.VALUE_PAID))
        .from(movements)
        .join(payments).on(payments.ID_MOVEMENT.eq(movements.ID))
        .where(movements.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
        .and(payments.METHOD.eq(Payment.Method.WALLET.name))
        .groupBy(movements.TYPE)
        .fetch()
        .associate { record -> Movement.Type.valueOf(record.value1()!!) to (record.value2() ?: BigDecimal.ZERO) }

    fun sumOpenExpenses(financialPeriodId: Long, today: LocalDate): OpenExpenses {

        val record = dsl
            .select(
                DSL.coalesce(DSL.sum(movements.VALUE), BigDecimal.ZERO),
                DSL.count().filterWhere(movements.DUE_DATE.lt(today))
            )
            .from(movements)
            .where(movements.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
            .and(movements.TYPE.eq(Movement.Type.EXPENSE.name))
            .and(movements.STATUS.eq(Movement.Status.OPEN.name))
            .fetchSingle()

        return OpenExpenses(record.value1()!!, record.value2()!!)
    }

    fun insert(movement: Movement): Movement {
        val record = dsl.insertInto(MOVEMENTS)
            .set(MOVEMENTS.EXTERNAL_ID, UUID.randomUUID())
            .set(MOVEMENTS.VERSION, 0)
            .set(MOVEMENTS.CREATED_ON, LocalDateTime.now())
            .set(MOVEMENTS.NAME, movement.name)
            .set(MOVEMENTS.TYPE, movement.type.name)
            .set(MOVEMENTS.VALUE, movement.value)
            .set(MOVEMENTS.DUE_DATE, movement.dueDate)
            .set(MOVEMENTS.STATUS, movement.status.name)
            .set(MOVEMENTS.DESCRIPTION, movement.description)
            .set(MOVEMENTS.ID_FINANCIAL_PERIOD, movement.financialPeriod.id)
            .set(MOVEMENTS.ID_CLASSIFICATION, movement.classification?.id)
            .set(MOVEMENTS.ID_COST_CENTER, movement.costCenter?.id)
            .set(MOVEMENTS.ID_INVOICE, movement.invoice?.id)
            .returning()
            .fetchSingle()

        movement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return movement
    }

    fun update(movement: Movement): Movement {
        val record = dsl.update(MOVEMENTS)
            .set(MOVEMENTS.NAME, movement.name)
            .set(MOVEMENTS.VALUE, movement.value)
            .set(MOVEMENTS.DUE_DATE, movement.dueDate)
            .set(MOVEMENTS.STATUS, movement.status.name)
            .set(MOVEMENTS.DESCRIPTION, movement.description)
            .set(MOVEMENTS.ID_CLASSIFICATION, movement.classification?.id)
            .set(MOVEMENTS.ID_COST_CENTER, movement.costCenter?.id)
            .set(MOVEMENTS.VERSION, MOVEMENTS.VERSION.plus(1))
            .set(MOVEMENTS.LAST_UPDATE, LocalDateTime.now())
            .where(MOVEMENTS.ID.eq(movement.id))
            .and(MOVEMENTS.VERSION.eq(movement.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        movement.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return movement
    }

    fun delete(movement: Movement) {
        dsl.deleteFrom(MOVEMENTS)
            .where(MOVEMENTS.ID.eq(movement.id))
            .execute()
    }

    private fun selectJoined() = dsl.select().from(movements).joinReferences()

    private fun <R : Record> SelectJoinStep<R>.joinReferences(): SelectJoinStep<R> = this
        .leftJoin(classifications).on(classifications.ID.eq(movements.ID_CLASSIFICATION))
        .leftJoin(costCenters).on(costCenters.ID.eq(movements.ID_COST_CENTER))
        .join(financialPeriods).on(financialPeriods.ID.eq(movements.ID_FINANCIAL_PERIOD))
        .leftJoin(payments).on(payments.ID_MOVEMENT.eq(movements.ID))
        .leftJoin(wallets).on(wallets.ID.eq(payments.ID_WALLET))
        .leftJoin(cards).on(cards.ID.eq(payments.ID_CARD))
        .leftJoin(invoices).on(invoices.ID.eq(movements.ID_INVOICE))
        .leftJoin(invoiceCards).on(invoiceCards.ID.eq(invoices.ID_CARD))
        .leftJoin(recurringLaunches).on(recurringLaunches.ID_MOVEMENT.eq(movements.ID))
        .leftJoin(recurringMovements).on(recurringMovements.ID.eq(recurringLaunches.ID_RECURRING_MOVEMENT))
        .leftJoin(recurringCards).on(recurringCards.ID.eq(recurringMovements.ID_CARD))

    private fun Record.toMovement(): Movement {

        val paymentRecord = into(payments)
        val payment = paymentRecord.id?.let {
            val walletRecord = into(wallets)
            val cardRecord = into(cards)
            paymentRecord.toPayment(
                wallet = walletRecord.id?.let { walletRecord.toWalletReference() },
                card = cardRecord.id?.let { cardRecord.toCardReference() }
            )
        }

        val classificationRecord = into(classifications)
        val costCenterRecord = into(costCenters)
        val financialPeriod = into(financialPeriods).toFinancialPeriodReference()
        val invoiceRecord = into(invoices)
        val recurringRecord = into(recurringMovements)
        val recurringCardRecord = into(recurringCards)

        val recurringReference = recurringRecord.id?.let {
            RecurringMovementReference(
                externalId = recurringRecord.externalId!!,
                name = recurringRecord.name!!,
                card = recurringCardRecord.id?.let { recurringCardRecord.toCardReference() }
            )
        }

        val invoice = invoiceRecord.id?.let {
            Invoice(into(invoiceCards).toCardReference(), financialPeriod, Invoice.Status.valueOf(invoiceRecord.status!!))
                .also { it.restore(invoiceRecord.id, invoiceRecord.externalId, invoiceRecord.version, invoiceRecord.createdOn, invoiceRecord.lastUpdate) }
        }

        return into(movements).toMovement(
            classification = classificationRecord.id?.let { classificationRecord.toClassificationReference() },
            costCenter = costCenterRecord.id?.let { costCenterRecord.toCostCenterReference() },
            financialPeriod = financialPeriod,
            payment = payment,
            invoice = invoice,
            recurringMovement = recurringReference
        )
    }
}

data class OpenExpenses(
    val total: BigDecimal,
    val overdueCount: Int
)

data class MovementCriteria(
    val text: String? = null,
    val type: Movement.Type? = null,
    val statuses: List<Movement.Status>? = null,
    val overdue: Boolean? = null,
    val classification: UUID? = null,
    val costCenter: UUID? = null,
    val financialPeriods: List<UUID>? = null,
    val dueFrom: LocalDate? = null,
    val dueTo: LocalDate? = null,
    val invoicePayments: Boolean? = null
)
