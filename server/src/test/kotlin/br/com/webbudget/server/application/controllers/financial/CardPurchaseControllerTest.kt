package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.CARD_PURCHASES
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
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
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-card-purchases.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class CardPurchaseControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require authentication and the financial role`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isUnauthorized

        authenticateWithRoles("REGISTRATION")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should list the purchases from the newest to the oldest by default`() {

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.content[0].name").isEqualTo("Books")
            .jsonPath("$.content[0].invoice.status").isEqualTo("CLOSED")
            .jsonPath("$.content[0].card.name").isEqualTo("Financial test card")
            .jsonPath("$.content[0].card.lastFourDigits").isEqualTo("9101")
            .jsonPath("$.content[0].classification.id").isEqualTo(EXPENSE_CLASSIFICATION)
            .jsonPath("$.content[0].classification.name").isEqualTo("Financial test gym")
            .jsonPath("$.content[0].costCenter.id").isEqualTo(HEALTH_COST_CENTER)
            .jsonPath("$.content[0].costCenter.name").isEqualTo("Financial test health")
            .jsonPath("$.content[2].name").isEqualTo("Pizza")
            .jsonPath("$.content[2].value").isEqualTo(80.0)
    }

    @Test
    fun `should filter the purchases`() {

        assertTotal("filter=PIZZA", 1)
        assertTotal("card=$CARD", 3)
        assertTotal("card=$OTHER_CARD", 0)
        assertTotal("invoice=$OPEN_INVOICE", 2)
        assertTotal("financialPeriod=$OPEN_PERIOD", 2)
        assertTotal("costCenter=$HOME_COST_CENTER", 1)
        assertTotal("classification=$EXPENSE_CLASSIFICATION", 3)
        assertTotal("from=2024-12-05&to=2024-12-20", 2)
        assertTotal("from=2024-12-06&to=2024-12-19", 0)
    }

    @Test
    fun `should page and sort the purchases`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=value,desc&size=1&page=1")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Pizza")
            .jsonPath("$.page.totalPages").isEqualTo(3)
    }

    @Test
    fun `should find a purchase by id`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$PIZZA_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Pizza")
            .jsonPath("$.purchasedOn").isEqualTo("2024-12-05")
            .jsonPath("$.invoice.id").isEqualTo(OPEN_INVOICE)
            .jsonPath("$.financialPeriod.id").isEqualTo(OPEN_PERIOD)
            .jsonPath("$.classification.id").isEqualTo(EXPENSE_CLASSIFICATION)
            .jsonPath("$.costCenter.id").isEqualTo(HOME_COST_CENTER)
            .jsonPath("$.movement").doesNotExist()

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should create the purchase in the open invoice of the card and period`() {

        create(name = "Gas").expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location).matches("http://localhost:[0-9]+/private/v1/financial/card-purchases/[0-9a-f-]{36}")
            }

        val created = dsl.selectFrom(CARD_PURCHASES).where(CARD_PURCHASES.NAME.eq("Gas")).fetchSingle()

        assertThat(created.idInvoice).isEqualTo(9101L)
        assertThat(created.purchasedOn).isEqualTo(LocalDate.now())
        assertThat(created.idMovement).isNull()
        assertThat(created.version).isEqualTo(0.toShort())

        restTestClient.get()
            .uri("/private/v1/financial/invoices/$OPEN_INVOICE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.value").isEqualTo(135.5)
    }

    @Test
    fun `should not change any wallet nor the result of the period`() {

        create().expectStatus().isCreated

        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isZero()

        restTestClient.get()
            .uri("/private/v1/financial/financial-periods/$OPEN_PERIOD/result")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.result").isEqualTo(0)
    }

    @Test
    fun `should refuse the purchase when there is no open invoice`() {

        create(card = OTHER_CARD, period = EXPIRED_PERIOD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("no-open-invoice")

        create(card = CARD, period = EXPIRED_PERIOD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("no-open-invoice")

        assertThat(dsl.fetchCount(CARD_PURCHASES)).isEqualTo(3)
    }

    @Test
    fun `should refuse the purchase of a period that is not open`() {

        create(period = CLOSED_PERIOD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-not-open")
    }

    @Test
    fun `should refuse an income classification and inactive references`() {

        create(classification = INCOME_CLASSIFICATION)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("classification-type-mismatch")

        create(classification = INACTIVE_CLASSIFICATION)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-classification")

        create(costCenter = INACTIVE_COST_CENTER)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-cost-center")
    }

    @Test
    fun `should answer unprocessable content or not found for invalid references`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": " ", "value": 0}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.value").isEqualTo("is-not-positive")
            .jsonPath("$.parameters.card").isEqualTo("is-null")
            .jsonPath("$.parameters.financialPeriod").isEqualTo("is-null")
            .jsonPath("$.parameters.classification").isEqualTo("is-null")
            .jsonPath("$.parameters.costCenter").isEqualTo("is-null")

        create(card = UUID.randomUUID().toString()).expectStatus().isNotFound
        create(period = UUID.randomUUID().toString()).expectStatus().isNotFound
        create(classification = UUID.randomUUID().toString()).expectStatus().isNotFound
        create(costCenter = UUID.randomUUID().toString()).expectStatus().isNotFound
    }

    @Test
    fun `should update the purchase while the invoice is open`() {

        update(PIZZA_ID, """{"name": "Pizza renamed", "value": 90.00, "purchasedOn": "2024-12-06", "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Pizza renamed")
            .jsonPath("$.value").isEqualTo(90.0)
            .jsonPath("$.purchasedOn").isEqualTo("2024-12-06")
            .jsonPath("$.costCenter.id").isEqualTo(HEALTH_COST_CENTER)

        val updated = dsl.selectFrom(CARD_PURCHASES).where(CARD_PURCHASES.NAME.eq("Pizza renamed")).fetchSingle()

        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.lastUpdate).isNotNull
    }

    @Test
    fun `should keep the date of the purchase when the update does not send one`() {

        update(PIZZA_ID, """{"name": "Pizza", "value": 80.00, "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HOME_COST_CENTER"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.purchasedOn").isEqualTo("2024-12-05")
    }

    @Test
    fun `should refuse to change or delete a purchase of a closed invoice`() {

        update(BOOKS_ID, """{"name": "Books", "value": 80.00, "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invoice-not-open")

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$BOOKS_ID")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invoice-not-open")
    }

    @Test
    fun `should answer not found when changing or deleting an unknown purchase`() {

        update(UUID.randomUUID().toString(), """{"name": "Name", "value": 1, "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}""")
            .expectStatus().isNotFound

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should delete a purchase of an open invoice`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$PIZZA_ID")
            .exchange()
            .expectStatus().isOk

        assertThat(dsl.fetchCount(CARD_PURCHASES)).isEqualTo(2)
    }

    @Test
    fun `should not delete a period that has purchases`() {

        restTestClient.delete()
            .uri("/private/v1/financial/financial-periods/$OPEN_PERIOD")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-with-purchases")
    }

    private fun assertTotal(query: String, expected: Int) {
        restTestClient.get()
            .uri("$ENDPOINT_URL?$query")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(expected)
    }

    private fun create(
        name: String = "Purchase",
        card: String = CARD,
        period: String = OPEN_PERIOD,
        classification: String = EXPENSE_CLASSIFICATION,
        costCenter: String = HEALTH_COST_CENTER
    ) = restTestClient.post()
        .uri(ENDPOINT_URL)
        .contentType(MediaType.APPLICATION_JSON)
        .body(
            """{"name": "$name", "value": 10.00, "card": "$card", "financialPeriod": "$period",
                "classification": "$classification", "costCenter": "$costCenter"}"""
        )
        .exchange()

    private fun update(id: String, body: String) = restTestClient.put()
        .uri("$ENDPOINT_URL/$id")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    companion object {
        private const val ENDPOINT_URL = "/private/v1/financial/card-purchases"

        private const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
        private const val OTHER_CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b02"
        private const val OPEN_INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e01"

        private const val PIZZA_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c01"
        private const val BOOKS_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c03"

        private const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val CLOSED_PERIOD = "6531c609-577b-4a45-82a9-debe0b53eeab"
        private const val EXPIRED_PERIOD = "6248abb7-a8ad-4d2b-a0a4-0417b98cb008"

        private const val EXPENSE_CLASSIFICATION = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val INCOME_CLASSIFICATION = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
        private const val INACTIVE_CLASSIFICATION = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a03"

        private const val HEALTH_COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val HOME_COST_CENTER = "bfe5413f-1cc6-46cb-967c-8a3b11046747"
        private const val INACTIVE_COST_CENTER = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a04"
    }
}
