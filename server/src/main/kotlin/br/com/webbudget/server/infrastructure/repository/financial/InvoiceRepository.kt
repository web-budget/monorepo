package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.CardReference
import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.CARD_PURCHASES
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.DSLContext
import org.jooq.Field
import org.jooq.Record
import org.jooq.SelectJoinStep
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Repository
class InvoiceRepository(
    private val dsl: DSLContext
) {

    private val invoices = INVOICES.`as`("invoices")
    private val cards = CARDS.`as`("cards")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
    private val purchases = CARD_PURCHASES.`as`("card_purchases")

    private val invoiceValue: Field<BigDecimal> = DSL.field(
        DSL.select(DSL.coalesce(DSL.sum(purchases.VALUE), BigDecimal.ZERO))
            .from(purchases)
            .where(purchases.ID_INVOICE.eq(invoices.ID))
    ).`as`("invoice_value")

    fun findActiveCards(): List<CardReference> {
        val activeCards = CARDS.`as`("active_cards")
        return dsl.selectFrom(activeCards)
            .where(activeCards.ACTIVE.isTrue)
            .orderBy(activeCards.ID)
            .fetch { record -> record.toCardReference() }
    }

    fun findByExternalId(externalId: UUID): Invoice? = selectJoined()
        .where(invoices.EXTERNAL_ID.eq(externalId))
        .fetchOne()
        ?.toInvoice()

    fun findByCardAndFinancialPeriod(cardId: Long, financialPeriodId: Long): Invoice? = selectJoined()
        .where(invoices.ID_CARD.eq(cardId))
        .and(invoices.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
        .fetchOne()
        ?.toInvoice()

    fun findAll(criteria: InvoiceCriteria, pageable: Pageable): PagedModel<Invoice> {

        val condition = DSL.and(
            listOfNotNull(
                criteria.card?.let { cards.EXTERNAL_ID.eq(it) },
                criteria.financialPeriod?.let { financialPeriods.EXTERNAL_ID.eq(it) },
                criteria.statuses?.takeIf { it.isNotEmpty() }
                    ?.let { statuses -> invoices.STATUS.`in`(statuses.map(Invoice.Status::name)) }
            )
        )

        val sortable = mapOf(
            "name" to cards.NAME,
            "status" to invoices.STATUS,
            "value" to invoiceValue,
            "createdOn" to invoices.CREATED_ON
        )

        val content = selectJoined()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, invoices.CREATED_ON, invoices.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toInvoice() }

        val total = dsl.fetchCount(dsl.selectOne().from(invoices).joinReferences().where(condition))

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun existsByCardAndFinancialPeriod(cardId: Long, financialPeriodId: Long): Boolean = dsl.fetchExists(
        dsl.selectOne().from(INVOICES)
            .where(INVOICES.ID_CARD.eq(cardId))
            .and(INVOICES.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
    )

    fun insert(cardId: Long, financialPeriodId: Long, status: Invoice.Status): UUID {
        val record = dsl.insertInto(INVOICES)
            .set(INVOICES.EXTERNAL_ID, UUID.randomUUID())
            .set(INVOICES.VERSION, 0)
            .set(INVOICES.CREATED_ON, LocalDateTime.now())
            .set(INVOICES.STATUS, status.name)
            .set(INVOICES.ID_CARD, cardId)
            .set(INVOICES.ID_FINANCIAL_PERIOD, financialPeriodId)
            .returning()
            .fetchSingle()

        return record.externalId!!
    }

    fun updateStatus(invoiceId: Long, from: Invoice.Status, to: Invoice.Status) {
        val updated = dsl.update(INVOICES)
            .set(INVOICES.STATUS, to.name)
            .set(INVOICES.VERSION, INVOICES.VERSION.plus(1))
            .set(INVOICES.LAST_UPDATE, LocalDateTime.now())
            .where(INVOICES.ID.eq(invoiceId))
            .and(INVOICES.STATUS.eq(from.name))
            .execute()

        if (updated == 0) {
            throw concurrentUpdate()
        }
    }

    fun deleteByFinancialPeriod(financialPeriodId: Long) {
        dsl.deleteFrom(INVOICES)
            .where(INVOICES.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
            .execute()
    }

    private fun selectJoined() = dsl
        .select(*invoices.fields(), *cards.fields(), *financialPeriods.fields(), invoiceValue)
        .from(invoices)
        .joinReferences()

    private fun <R : Record> SelectJoinStep<R>.joinReferences(): SelectJoinStep<R> = this
        .join(cards).on(cards.ID.eq(invoices.ID_CARD))
        .join(financialPeriods).on(financialPeriods.ID.eq(invoices.ID_FINANCIAL_PERIOD))

    private fun Record.toInvoice(): Invoice {

        val invoiceRecord = into(invoices)

        return Invoice(
            card = into(cards).toCardReference(),
            financialPeriod = into(financialPeriods).toFinancialPeriodReference(),
            status = Invoice.Status.valueOf(invoiceRecord.status!!),
            value = get(invoiceValue)
        ).also { invoice ->
            invoice.restore(
                invoiceRecord.id,
                invoiceRecord.externalId,
                invoiceRecord.version,
                invoiceRecord.createdOn,
                invoiceRecord.lastUpdate
            )
        }
    }
}

data class InvoiceCriteria(
    val card: UUID? = null,
    val financialPeriod: UUID? = null,
    val statuses: List<Invoice.Status>? = null
)
