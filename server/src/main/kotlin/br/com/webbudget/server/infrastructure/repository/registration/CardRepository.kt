package br.com.webbudget.server.infrastructure.repository.registration

import br.com.webbudget.server.domain.entities.registration.Card
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.excluding
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class CardRepository(
    private val dsl: DSLContext
) {

    fun findByExternalId(externalId: UUID): Card? {

        val cards = CARDS.`as`("cards")
        val wallets = WALLETS.`as`("wallets")

        val record = dsl.select()
            .from(cards)
            .leftJoin(wallets).on(wallets.ID.eq(cards.ID_WALLET))
            .where(cards.EXTERNAL_ID.eq(externalId))
            .fetchOne() ?: return null

        val wallet = record.get(wallets.ID)?.let { record.into(wallets).toWallet() }

        return record.into(cards).toCard(wallet)
    }

    fun findAll(filter: String?, active: Boolean?, pageable: Pageable): PagedModel<Card> {

        val cards = CARDS.`as`("cards")

        val textCondition = filter?.let { text ->
            anyOf(
                listOf(
                    containsIgnoreCase(cards.NAME, text),
                    containsIgnoreCase(cards.LAST_FOUR_DIGITS, text),
                    containsIgnoreCase(cards.FLAG, text)
                )
            )
        }

        val condition = allOf(listOfNotNull(active?.let { cards.ACTIVE.eq(it) }, textCondition))

        val sortable = mapOf(
            "name" to cards.NAME,
            "lastFourDigits" to cards.LAST_FOUR_DIGITS,
            "type" to cards.TYPE,
            "active" to cards.ACTIVE,
            "invoicePaymentDay" to cards.INVOICE_PAYMENT_DAY,
            "flag" to cards.FLAG,
            "createdOn" to cards.CREATED_ON
        )

        val content = dsl.selectFrom(cards)
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, cards.CREATED_ON, cards.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch { record -> record.toCard() }

        val total = dsl.fetchCount(cards, condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun existsByTypeAndLastFourDigits(
        type: Card.Type,
        lastFourDigits: String,
        excludingExternalId: UUID? = null
    ): Boolean = dsl.fetchExists(
        dsl.selectOne().from(CARDS)
            .where(CARDS.TYPE.eq(type.name))
            .and(CARDS.LAST_FOUR_DIGITS.eq(lastFourDigits))
            .and(CARDS.EXTERNAL_ID.excluding(excludingExternalId))
    )

    fun insert(card: Card): Card {
        val record = dsl.insertInto(CARDS)
            .set(CARDS.EXTERNAL_ID, UUID.randomUUID())
            .set(CARDS.VERSION, 0)
            .set(CARDS.CREATED_ON, LocalDateTime.now())
            .set(CARDS.ACTIVE, card.active)
            .set(CARDS.NAME, card.name)
            .set(CARDS.LAST_FOUR_DIGITS, card.lastFourDigits)
            .set(CARDS.TYPE, card.type.name)
            .set(CARDS.INVOICE_PAYMENT_DAY, card.invoicePaymentDay)
            .set(CARDS.FLAG, card.flag)
            .set(CARDS.ID_WALLET, card.wallet?.id)
            .returning()
            .fetchSingle()

        card.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return card
    }

    fun update(card: Card): Card {
        val record = dsl.update(CARDS)
            .set(CARDS.ACTIVE, card.active)
            .set(CARDS.NAME, card.name)
            .set(CARDS.LAST_FOUR_DIGITS, card.lastFourDigits)
            .set(CARDS.TYPE, card.type.name)
            .set(CARDS.INVOICE_PAYMENT_DAY, card.invoicePaymentDay)
            .set(CARDS.FLAG, card.flag)
            .set(CARDS.ID_WALLET, card.wallet?.id)
            .set(CARDS.VERSION, CARDS.VERSION.plus(1))
            .set(CARDS.LAST_UPDATE, LocalDateTime.now())
            .where(CARDS.ID.eq(card.id))
            .and(CARDS.VERSION.eq(card.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        card.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return card
    }

    fun delete(card: Card) {
        dsl.deleteFrom(CARDS)
            .where(CARDS.ID.eq(card.id))
            .execute()
    }
}
