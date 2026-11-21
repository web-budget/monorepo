package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.CardPurchase
import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.CARD_PURCHASES
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
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
class CardPurchaseRepository(
    private val dsl: DSLContext
) {

    private val purchases = CARD_PURCHASES.`as`("card_purchases")
    private val invoices = INVOICES.`as`("invoices")
    private val cards = CARDS.`as`("cards")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val movements = MOVEMENTS.`as`("movements")

    fun findByExternalId(externalId: UUID): CardPurchase? = selectJoined()
        .where(purchases.EXTERNAL_ID.eq(externalId))
        .fetchOne()
        ?.toCardPurchase()

    fun findByMovement(movementId: Long): CardPurchase? = selectJoined()
        .where(purchases.ID_MOVEMENT.eq(movementId))
        .fetchOne()
        ?.toCardPurchase()

    fun findAll(criteria: CardPurchaseCriteria, pageable: Pageable): PagedModel<CardPurchase> {

        val condition = DSL.and(
            listOfNotNull(
                criteria.text?.let { purchases.NAME.containsIgnoreCase(it) },
                criteria.card?.let { cards.EXTERNAL_ID.eq(it) },
                criteria.invoice?.let { invoices.EXTERNAL_ID.eq(it) },
                criteria.financialPeriod?.let { financialPeriods.EXTERNAL_ID.eq(it) },
                criteria.costCenter?.let { costCenters.EXTERNAL_ID.eq(it) },
                criteria.classification?.let { classifications.EXTERNAL_ID.eq(it) },
                criteria.from?.let { purchases.PURCHASED_ON.ge(it) },
                criteria.to?.let { purchases.PURCHASED_ON.le(it) }
            )
        )

        val sortable = mapOf(
            "name" to purchases.NAME,
            "purchasedOn" to purchases.PURCHASED_ON,
            "value" to purchases.VALUE,
            "createdOn" to purchases.CREATED_ON
        )

        val content = selectJoined()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, purchases.CREATED_ON, purchases.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toCardPurchase() }

        val total = dsl.fetchCount(dsl.selectOne().from(purchases).joinReferences().where(condition))

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun existsByFinancialPeriod(financialPeriodId: Long): Boolean = dsl.fetchExists(
        dsl.selectOne().from(CARD_PURCHASES)
            .join(INVOICES).on(INVOICES.ID.eq(CARD_PURCHASES.ID_INVOICE))
            .where(INVOICES.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
    )

    fun insert(purchase: CardPurchase): CardPurchase {
        val record = dsl.insertInto(CARD_PURCHASES)
            .set(CARD_PURCHASES.EXTERNAL_ID, UUID.randomUUID())
            .set(CARD_PURCHASES.VERSION, 0)
            .set(CARD_PURCHASES.CREATED_ON, LocalDateTime.now())
            .set(CARD_PURCHASES.NAME, purchase.name)
            .set(CARD_PURCHASES.PURCHASED_ON, purchase.purchasedOn)
            .set(CARD_PURCHASES.VALUE, purchase.value)
            .set(CARD_PURCHASES.ID_INVOICE, purchase.invoice!!.id)
            .set(CARD_PURCHASES.ID_CLASSIFICATION, purchase.classification.id)
            .set(CARD_PURCHASES.ID_COST_CENTER, purchase.costCenter.id)
            .set(CARD_PURCHASES.ID_MOVEMENT, purchase.movementId)
            .returning()
            .fetchSingle()

        purchase.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return purchase
    }

    fun update(purchase: CardPurchase): CardPurchase {
        val record = dsl.update(CARD_PURCHASES)
            .set(CARD_PURCHASES.NAME, purchase.name)
            .set(CARD_PURCHASES.PURCHASED_ON, purchase.purchasedOn)
            .set(CARD_PURCHASES.VALUE, purchase.value)
            .set(CARD_PURCHASES.ID_CLASSIFICATION, purchase.classification.id)
            .set(CARD_PURCHASES.ID_COST_CENTER, purchase.costCenter.id)
            .set(CARD_PURCHASES.VERSION, CARD_PURCHASES.VERSION.plus(1))
            .set(CARD_PURCHASES.LAST_UPDATE, LocalDateTime.now())
            .where(CARD_PURCHASES.ID.eq(purchase.id))
            .and(CARD_PURCHASES.VERSION.eq(purchase.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        purchase.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return purchase
    }

    fun delete(purchase: CardPurchase) {
        dsl.deleteFrom(CARD_PURCHASES)
            .where(CARD_PURCHASES.ID.eq(purchase.id))
            .execute()
    }

    private fun selectJoined() = dsl.select().from(purchases).joinReferences()

    private fun <R : Record> SelectJoinStep<R>.joinReferences(): SelectJoinStep<R> = this
        .join(invoices).on(invoices.ID.eq(purchases.ID_INVOICE))
        .join(cards).on(cards.ID.eq(invoices.ID_CARD))
        .join(financialPeriods).on(financialPeriods.ID.eq(invoices.ID_FINANCIAL_PERIOD))
        .join(classifications).on(classifications.ID.eq(purchases.ID_CLASSIFICATION))
        .join(costCenters).on(costCenters.ID.eq(purchases.ID_COST_CENTER))
        .leftJoin(movements).on(movements.ID.eq(purchases.ID_MOVEMENT))

    private fun Record.toCardPurchase(): CardPurchase {

        val purchaseRecord = into(purchases)
        val invoiceRecord = into(invoices)
        val card = into(cards).toCardReference()
        val period = into(financialPeriods).toFinancialPeriodReference()

        val invoice = Invoice(card, period, Invoice.Status.valueOf(invoiceRecord.status!!), BigDecimal.ZERO)
            .also { it.restore(invoiceRecord.id, invoiceRecord.externalId, invoiceRecord.version, invoiceRecord.createdOn, invoiceRecord.lastUpdate) }

        return CardPurchase(
            name = purchaseRecord.name!!,
            purchasedOn = purchaseRecord.purchasedOn!!,
            value = purchaseRecord.value!!,
            classification = into(classifications).toClassificationReference(),
            costCenter = into(costCenters).toCostCenterReference(),
            card = card,
            financialPeriod = period,
            invoice = invoice,
            movementId = purchaseRecord.idMovement,
            movementExternalId = into(movements).externalId
        ).also { purchase ->
            purchase.restore(
                purchaseRecord.id,
                purchaseRecord.externalId,
                purchaseRecord.version,
                purchaseRecord.createdOn,
                purchaseRecord.lastUpdate
            )
        }
    }
}

data class CardPurchaseCriteria(
    val text: String? = null,
    val card: UUID? = null,
    val invoice: UUID? = null,
    val financialPeriod: UUID? = null,
    val costCenter: UUID? = null,
    val classification: UUID? = null,
    val from: LocalDate? = null,
    val to: LocalDate? = null
)
