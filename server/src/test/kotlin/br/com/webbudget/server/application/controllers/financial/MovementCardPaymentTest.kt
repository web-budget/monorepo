package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.CARD_PURCHASES
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.PAYMENTS
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.time.LocalDate
import java.util.UUID

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-movements.sql",
    "/sql/financial/create-invoices.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class MovementCardPaymentTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should pay an expense by card creating a purchase in the open invoice`() {

        payByCard(GYM_ID, discount = "20.00")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PAID")
            .jsonPath("$.payment.card.id").isEqualTo(CARD)
            .jsonPath("$.payment.card.name").isEqualTo("Financial test card")
            .jsonPath("$.payment.wallet").doesNotExist()
            .jsonPath("$.payment.valuePaid").isEqualTo(300.0)

        val purchase = dsl.selectFrom(CARD_PURCHASES).fetchSingle()
        val movement = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Gym")).fetchSingle()

        assertThat(purchase.name).isEqualTo("Gym")
        assertThat(purchase.value).isEqualByComparingTo("300.00")
        assertThat(purchase.purchasedOn).isEqualTo(LocalDate.now())
        assertThat(purchase.idInvoice).isEqualTo(9101L)
        assertThat(purchase.idMovement).isEqualTo(movement.id)
        assertThat(purchase.idClassification).isEqualTo(9101L)
        assertThat(purchase.idCostCenter).isEqualTo(9101L)

        val payment = dsl.selectFrom(PAYMENTS).fetchSingle()

        assertThat(payment.method).isEqualTo("CARD")
        assertThat(payment.idWallet).isNull()
        assertThat(payment.idCard).isEqualTo(9101L)
    }

    @Test
    fun `should not touch any wallet nor the provisional result when paying by card`() {

        payByCard(GYM_ID).expectStatus().isOk

        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isZero()
        assertThat(dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(9101L)).fetchSingle().value1())
            .isEqualByComparingTo("0")

        restTestClient.get()
            .uri("/private/v1/financial/financial-periods/$OPEN_PERIOD/result")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.expenses").isEqualTo(0)
            .jsonPath("$.result").isEqualTo(0)

        restTestClient.get()
            .uri("/private/v1/financial/invoices/$OPEN_INVOICE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.value").isEqualTo(320.0)
    }

    @Test
    fun `should count only the wallet payments in the provisional result`() {

        payByCard(GYM_ID).expectStatus().isOk
        payByWallet(GROCERIES_ID).expectStatus().isOk

        restTestClient.get()
            .uri("/private/v1/financial/financial-periods/$OPEN_PERIOD/result")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.expenses").isEqualTo(89.9)
    }

    @Test
    fun `should create the movement already paid by card`() {

        restTestClient.post()
            .uri(MOVEMENTS_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "Fuel", "type": "EXPENSE", "value": 50.00, "financialPeriod": "$OPEN_PERIOD",
                    "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER",
                    "payment": {"card": "$CARD"}}"""
            )
            .exchange()
            .expectStatus().isCreated

        assertThat(dsl.selectFrom(CARD_PURCHASES).fetchSingle().name).isEqualTo("Fuel")
    }

    @Test
    fun `should require exactly one of wallet and card`() {

        restTestClient.patch()
            .uri("$MOVEMENTS_URL/$GYM_ID/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"wallet": "$WALLET", "card": "$CARD"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("payment-requires-wallet-or-card")

        restTestClient.patch()
            .uri("$MOVEMENTS_URL/$GYM_ID/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("payment-requires-wallet-or-card")
    }

    @Test
    fun `should refuse to pay an income by card`() {

        restTestClient.post()
            .uri(MOVEMENTS_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "Bonus", "type": "INCOME", "value": 50.00, "financialPeriod": "$OPEN_PERIOD",
                    "classification": "$INCOME_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}"""
            )
            .exchange()
            .expectStatus().isCreated

        val bonus = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Bonus")).fetchSingle().externalId.toString()

        payByCard(bonus)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("card-payment-only-for-expenses")
    }

    @Test
    fun `should refuse to pay by an unknown or inactive card`() {

        restTestClient.patch()
            .uri("$MOVEMENTS_URL/$GYM_ID/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"card": "${UUID.randomUUID()}"}""")
            .exchange()
            .expectStatus().isNotFound

        dsl.update(CARDS).set(CARDS.ACTIVE, false).where(CARDS.ID.eq(9101L)).execute()

        payByCard(GYM_ID)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-card")
    }

    @Test
    fun `should refuse to pay by card without an open invoice in the period of the movement`() {

        restTestClient.post()
            .uri(MOVEMENTS_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "August", "type": "EXPENSE", "value": 50.00, "financialPeriod": "$EXPIRED_PERIOD",
                    "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}"""
            )
            .exchange()
            .expectStatus().isCreated

        val august = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("August")).fetchSingle().externalId.toString()

        payByCard(august)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("no-open-invoice")

        assertThat(dsl.fetchCount(PAYMENTS)).isZero()
        assertThat(dsl.fetchCount(CARD_PURCHASES)).isZero()
    }

    @Test
    fun `should undo the payment by card removing the purchase without any reversal`() {

        payByCard(GYM_ID).expectStatus().isOk

        restTestClient.patch()
            .uri("$MOVEMENTS_URL/$GYM_ID/undo-payment")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("OPEN")
            .jsonPath("$.payment").doesNotExist()

        assertThat(dsl.fetchCount(CARD_PURCHASES)).isZero()
        assertThat(dsl.fetchCount(PAYMENTS)).isZero()
        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isZero()

        payByCard(GYM_ID).expectStatus().isOk
    }

    @Test
    fun `should refuse to undo the payment when the invoice is not open anymore`() {

        payByCard(GYM_ID).expectStatus().isOk

        dsl.update(INVOICES).set(INVOICES.STATUS, "CLOSED").where(INVOICES.ID.eq(9101L)).execute()

        restTestClient.patch()
            .uri("$MOVEMENTS_URL/$GYM_ID/undo-payment")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invoice-not-open")

        assertThat(dsl.fetchCount(CARD_PURCHASES)).isEqualTo(1)
        assertThat(dsl.fetchCount(PAYMENTS)).isEqualTo(1)
        assertThat(dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Gym")).fetchSingle().status).isEqualTo("PAID")
    }

    @Test
    fun `should not change or delete a purchase that came from a movement`() {

        payByCard(GYM_ID).expectStatus().isOk

        val purchase = dsl.selectFrom(CARD_PURCHASES).fetchSingle().externalId.toString()

        restTestClient.put()
            .uri("/private/v1/financial/card-purchases/$purchase")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Other", "value": 1, "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("purchase-bound-to-movement")

        restTestClient.delete()
            .uri("/private/v1/financial/card-purchases/$purchase")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("purchase-bound-to-movement")

        restTestClient.get()
            .uri("/private/v1/financial/card-purchases/$purchase")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.movement").isEqualTo(GYM_ID)
    }

    private fun payByCard(movement: String, discount: String? = null) = restTestClient.patch()
        .uri("$MOVEMENTS_URL/$movement/pay")
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"card": "$CARD"${discount?.let { """, "discount": $it""" } ?: ""}}""")
        .exchange()

    private fun payByWallet(movement: String) = restTestClient.patch()
        .uri("$MOVEMENTS_URL/$movement/pay")
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"wallet": "$WALLET"}""")
        .exchange()

    companion object {
        private const val MOVEMENTS_URL = "/private/v1/financial/movements"

        private const val GYM_ID = "4a26f975-c9a9-4231-958c-9b59ee55e04f"
        private const val GROCERIES_ID = "c237997e-c784-429d-9d22-a9f5cc079822"

        private const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val OPEN_INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e01"

        private const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val EXPIRED_PERIOD = "6248abb7-a8ad-4d2b-a0a4-0417b98cb008"

        private const val EXPENSE_CLASSIFICATION = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val INCOME_CLASSIFICATION = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
        private const val HEALTH_COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
    }
}
