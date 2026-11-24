package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-card-purchases.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class CardInvoiceSynchronizationTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @AfterEach
    fun removeCreatedCard() {
        val created = dsl.select(CARDS.ID).from(CARDS).where(CARDS.LAST_FOUR_DIGITS.eq("7777"))
        dsl.deleteFrom(INVOICES).where(INVOICES.ID_CARD.`in`(created)).execute()
        dsl.deleteFrom(CARDS).where(CARDS.LAST_FOUR_DIGITS.eq("7777")).execute()
    }

    @Test
    fun `should open the invoice of a new card in every open period and in none of the closed ones`() {

        restTestClient.post()
            .uri(CARDS_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "New card", "lastFourDigits": "7777"}""")
            .exchange()
            .expectStatus().isCreated

        val newCardId = dsl.select(CARDS.ID).from(CARDS).where(CARDS.LAST_FOUR_DIGITS.eq("7777")).fetchSingle().value1()!!
        val invoices = dsl.selectFrom(INVOICES).where(INVOICES.ID_CARD.eq(newCardId)).fetch()

        assertThat(invoices.map { it.idFinancialPeriod }).containsExactlyInAnyOrder(9101L, 9103L)
        assertThat(invoices.map { it.status }).containsOnly("OPEN")
    }

    @Test
    fun `should not open invoices for a new inactive card`() {

        val before = dsl.fetchCount(INVOICES)

        restTestClient.post()
            .uri(CARDS_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "New card", "lastFourDigits": "7777"}""")
            .exchange()
            .expectStatus().isCreated

        val externalId = dsl.select(CARDS.EXTERNAL_ID).from(CARDS).where(CARDS.LAST_FOUR_DIGITS.eq("7777")).fetchSingle().value1()
        updateCard("$externalId", "7777", active = false)

        assertThat(dsl.fetchCount(INVOICES)).isEqualTo(before)
    }

    @Test
    fun `should remove the empty open invoices of a deactivated card and open them again when it is reactivated`() {

        assertThat(invoicesOf(OTHER_CARD_ID)).isEqualTo(1)

        updateCard(OTHER_CARD, "9102", active = false)

        assertThat(invoicesOf(OTHER_CARD_ID)).isZero()

        updateCard(OTHER_CARD, "9102", active = true)
        updateCard(OTHER_CARD, "9102", active = true)

        assertThat(invoicesOf(OTHER_CARD_ID)).isEqualTo(2)
    }

    @Test
    fun `should keep the invoices with purchases, the closed ones and the ones of closed periods when a card is deactivated`() {

        updateCard(CARD, "9101", active = false)

        assertThat(invoicesOf(CARD_ID)).isEqualTo(3)
    }

    private fun invoicesOf(cardId: Long): Int = dsl.fetchCount(INVOICES, INVOICES.ID_CARD.eq(cardId))

    private fun updateCard(externalId: String, lastFourDigits: String, active: Boolean) {
        restTestClient.put()
            .uri("$CARDS_URL/$externalId")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Card", "lastFourDigits": "$lastFourDigits", "active": $active}""")
            .exchange()
            .expectStatus().isOk
    }

    companion object {
        private const val CARDS_URL = "/private/v1/registration/cards"
        private const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
        private const val OTHER_CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b02"
        private const val CARD_ID = 9101L
        private const val OTHER_CARD_ID = 9102L
    }
}
