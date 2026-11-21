package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.CardReference
import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class InvoiceRepository(
    private val dsl: DSLContext
) {

    fun findActiveCards(): List<CardReference> {
        val cards = CARDS.`as`("cards")
        return dsl.selectFrom(cards)
            .where(cards.ACTIVE.isTrue)
            .orderBy(cards.ID)
            .fetch { record ->
                CardReference(
                    id = record.id!!,
                    externalId = record.externalId!!,
                    name = record.name!!,
                    active = record.active!!,
                    invoicePaymentDay = record.invoicePaymentDay!!
                )
            }
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

    fun deleteByFinancialPeriod(financialPeriodId: Long) {
        dsl.deleteFrom(INVOICES)
            .where(INVOICES.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
            .execute()
    }
}
