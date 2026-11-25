package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.util.UUID

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-card-purchases.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class InvoiceControllerTest : BaseIntegrationTest() {

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
    fun `should list the invoices with the value of their purchases`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=value,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(4)
            .jsonPath("$.content[0].id").isEqualTo(OPEN_INVOICE)
            .jsonPath("$.content[0].value").isEqualTo(125.5)
            .jsonPath("$.content[0].status").isEqualTo("OPEN")
            .jsonPath("$.content[0].card.name").isEqualTo("Financial test card")
            .jsonPath("$.content[0].card.lastFourDigits").isEqualTo("9101")
            .jsonPath("$.content[0].purchaseCount").isEqualTo(2)
            .jsonPath("$.content[0].dueDate").doesNotExist()
            .jsonPath("$.content[0].payment").doesNotExist()
            .jsonPath("$.content[0].financialPeriod.id").isEqualTo(OPEN_PERIOD)
            .jsonPath("$.content[0].financialPeriod.expired").isEqualTo(true)
            .jsonPath("$.content[1].value").isEqualTo(120.0)
            .jsonPath("$.content[1].status").isEqualTo("CLOSED")
            .jsonPath("$.content[3].value").isEqualTo(0)
            .jsonPath("$.content[3].purchaseCount").isEqualTo(0)
    }

    @Test
    fun `should filter the invoices`() {

        assertTotal("card=$CARD", 3)
        assertTotal("card=$OTHER_CARD", 1)
        assertTotal("financialPeriod=$OPEN_PERIOD", 2)
        assertTotal("statuses=CLOSED", 1)
        assertTotal("statuses=OPEN&statuses=PAID", 3)
        assertTotal("statuses=PAID", 0)
        assertTotal("card=$CARD&statuses=OPEN&financialPeriod=$OPEN_PERIOD", 1)
    }

    @Test
    fun `should sort the invoices by the name of the card`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=name,desc&size=1")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].card.name").isEqualTo("Financial test other card")
    }

    @Test
    fun `should sort the invoices by the start of the financial period`() {

        assertInvoiceOrder("sort=period,asc", JULY_INVOICE, AUGUST_INVOICE, OTHER_CARD_DECEMBER_INVOICE, OPEN_INVOICE)
        assertInvoiceOrder("sort=period,desc", OTHER_CARD_DECEMBER_INVOICE, OPEN_INVOICE, AUGUST_INVOICE, JULY_INVOICE)
    }

    @Test
    fun `should find an invoice by id`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$OPEN_INVOICE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(OPEN_INVOICE)
            .jsonPath("$.value").isEqualTo(125.5)
            .jsonPath("$.purchaseCount").isEqualTo(2)
            .jsonPath("$.card.lastFourDigits").isEqualTo("9101")

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    private fun assertInvoiceOrder(query: String, vararg expected: String) {

        val ids = mutableListOf<String>()

        restTestClient.get()
            .uri("$ENDPOINT_URL?$query")
            .exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                @Suppress("UNCHECKED_CAST")
                (body!!["content"] as List<Map<String, Any?>>).mapTo(ids) { it["id"] as String }
            }

        assertThat(ids).containsExactly(*expected)
    }

    private fun assertTotal(query: String, expected: Int) {
        restTestClient.get()
            .uri("$ENDPOINT_URL?$query")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(expected)
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/financial/invoices"
        private const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
        private const val OTHER_CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b02"
        private const val OPEN_INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e01"
        private const val AUGUST_INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e02"
        private const val OTHER_CARD_DECEMBER_INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e03"
        private const val JULY_INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e04"
        private const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
    }
}
