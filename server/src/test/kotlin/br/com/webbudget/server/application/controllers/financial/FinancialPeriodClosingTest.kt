package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.PERIOD_RESULTS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.util.UUID

@Sql("/sql/financial/clear-tables.sql", "/sql/financial/create-registration-data.sql")
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class FinancialPeriodClosingTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require the financial role`() {

        authenticateWithRoles("REGISTRATION")

        restTestClient.patch().uri("$PERIODS/$AUGUST/close").exchange().expectStatus().isForbidden
        restTestClient.patch().uri("$PERIODS/$AUGUST/reopen").exchange().expectStatus().isForbidden
    }

    @Test
    fun `should close an empty period, record a zero result and freeze it`() {

        close(AUGUST)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.revenues").isEqualTo(0)
            .jsonPath("$.expenses").isEqualTo(0)
            .jsonPath("$.result").isEqualTo(0)
            .jsonPath("$.recorded").isEqualTo(true)

        assertThat(statusOf(9103L)).isEqualTo("CLOSED")
        assertThat(dsl.fetchCount(PERIOD_RESULTS)).isEqualTo(1)

        result(AUGUST).expectBody().jsonPath("$.recorded").isEqualTo(true)

        createMovement("Late bill", "EXPENSE", "10.00", AUGUST).expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("financial-period-not-open")

        close(AUGUST).expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("financial-period-not-open")
    }

    @Test
    fun `should answer not found for an unknown period`() {

        close(UUID.randomUUID().toString()).expectStatus().isNotFound
        reopen(UUID.randomUUID().toString()).expectStatus().isNotFound
    }

    @Test
    fun `should answer the provisional result of a closed period that has no recorded result`() {

        result(JULY)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.recorded").isEqualTo(false)
            .jsonPath("$.result").isEqualTo(0)
    }

    @Test
    fun `should record the paid revenues and expenses and refuse to close with open movements`() {

        createMovement("Salary", "INCOME", "1000.00", DECEMBER, paid = true).expectStatus().isCreated
        createMovement("Rent", "EXPENSE", "400.00", DECEMBER, paid = true).expectStatus().isCreated
        createMovement("Water", "EXPENSE", "70.00", DECEMBER).expectStatus().isCreated

        result(DECEMBER)
            .expectBody()
            .jsonPath("$.recorded").isEqualTo(false)
            .jsonPath("$.result").isEqualTo(600)

        close(DECEMBER)
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("financial-period-with-open-movements")

        val water = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Water")).fetchSingle().externalId

        restTestClient.delete().uri("/private/v1/financial/movements/$water").exchange().expectStatus().isOk

        close(DECEMBER)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.revenues").isEqualTo(1000)
            .jsonPath("$.expenses").isEqualTo(400)
            .jsonPath("$.result").isEqualTo(600)

        result(DECEMBER).expectBody().jsonPath("$.recorded").isEqualTo(true).jsonPath("$.result").isEqualTo(600)

        val salary = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Salary")).fetchSingle().externalId

        listOf(
            restTestClient.put().uri("/private/v1/financial/movements/$salary").contentType(MediaType.APPLICATION_JSON)
                .body("""{"name": "Salary", "value": 1.00, "classification": "$INCOME", "costCenter": "$COST_CENTER"}""")
                .exchange(),
            restTestClient.delete().uri("/private/v1/financial/movements/$salary").exchange(),
            restTestClient.patch().uri("/private/v1/financial/movements/$salary/undo-payment").exchange(),
            restTestClient.patch().uri("/private/v1/financial/movements/$salary/pay")
                .contentType(MediaType.APPLICATION_JSON).body("""{"wallet": "$WALLET"}""").exchange()
        ).forEach { response ->
            response.expectStatus().isBadRequest
        }

        restTestClient.post().uri("/private/v1/financial/transfers").contentType(MediaType.APPLICATION_JSON)
            .body("""{"fromWallet": "$WALLET", "toWallet": "$OTHER_WALLET", "value": 10.00}""")
            .exchange()
            .expectStatus().isCreated
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-invoices.sql",
        "/sql/financial/create-card-purchases.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should close the empty invoices alone, count the invoice payment and reopen only those`() {

        close(DECEMBER)
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("financial-period-with-open-invoices")

        restTestClient.patch().uri("/private/v1/financial/invoices/$INVOICE/close").exchange().expectStatus().isOk

        close(DECEMBER)
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("financial-period-with-open-movements")

        val payment = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID_INVOICE.isNotNull).fetchSingle().externalId

        restTestClient.patch().uri("/private/v1/financial/movements/$payment/pay")
            .contentType(MediaType.APPLICATION_JSON).body("""{"wallet": "$WALLET"}""").exchange()
            .expectStatus().isOk

        close(DECEMBER)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.expenses").isEqualTo(125.5)
            .jsonPath("$.result").isEqualTo(-125.5)

        val emptyInvoice = dsl.selectFrom(INVOICES).where(INVOICES.ID.eq(9103L)).fetchSingle()
        assertThat(emptyInvoice.status).isEqualTo("PAID")
        assertThat(emptyInvoice.closedAutomatically).isTrue()
        assertThat(dsl.selectFrom(INVOICES).where(INVOICES.ID.eq(9101L)).fetchSingle().closedAutomatically).isFalse()

        listOf(
            restTestClient.put().uri("/private/v1/financial/card-purchases/$PURCHASE").contentType(MediaType.APPLICATION_JSON)
                .body("""{"name": "Pizza", "purchasedOn": "2024-12-05", "value": 1.00, "classification": "$EXPENSE", "costCenter": "$COST_CENTER"}""")
                .exchange(),
            restTestClient.delete().uri("/private/v1/financial/card-purchases/$PURCHASE").exchange(),
            restTestClient.post().uri("/private/v1/financial/card-purchases").contentType(MediaType.APPLICATION_JSON)
                .body("""{"name": "New", "value": 1.00, "card": "$CARD", "financialPeriod": "$DECEMBER", "classification": "$EXPENSE", "costCenter": "$COST_CENTER"}""")
                .exchange(),
            restTestClient.patch().uri("/private/v1/financial/invoices/$INVOICE/close").exchange(),
            restTestClient.delete().uri("/private/v1/financial/movements/$payment").exchange(),
            restTestClient.patch().uri("/private/v1/financial/movements/$payment/undo-payment").exchange()
        ).forEach { response ->
            response.expectStatus().isBadRequest
        }

        reopen(DECEMBER).expectStatus().isOk

        assertThat(statusOf(9101L)).isEqualTo("OPEN")
        assertThat(dsl.fetchCount(PERIOD_RESULTS)).isZero()

        val reopened = dsl.selectFrom(INVOICES).where(INVOICES.ID.eq(9103L)).fetchSingle()
        assertThat(reopened.status).isEqualTo("OPEN")
        assertThat(reopened.closedAutomatically).isFalse()
        assertThat(dsl.selectFrom(INVOICES).where(INVOICES.ID.eq(9101L)).fetchSingle().status).isEqualTo("PAID")
    }

    @Test
    fun `should reopen only the last closed period`() {

        close(AUGUST).expectStatus().isOk
        close(DECEMBER).expectStatus().isOk

        reopen(AUGUST)
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("only-the-last-closed-period-can-be-reopened")

        reopen(DECEMBER).expectStatus().isOk
        reopen(AUGUST).expectStatus().isOk

        assertThat(statusOf(9101L)).isEqualTo("OPEN")
        assertThat(statusOf(9103L)).isEqualTo("OPEN")

        reopen(AUGUST)
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("financial-period-not-closed")
    }

    private fun statusOf(financialPeriodId: Long): String =
        dsl.select(FINANCIAL_PERIODS.STATUS).from(FINANCIAL_PERIODS).where(FINANCIAL_PERIODS.ID.eq(financialPeriodId))
            .fetchSingle().value1()!!

    private fun close(period: String): ResponseSpec = restTestClient.patch().uri("$PERIODS/$period/close").exchange()

    private fun reopen(period: String): ResponseSpec = restTestClient.patch().uri("$PERIODS/$period/reopen").exchange()

    private fun result(period: String): ResponseSpec = restTestClient.get().uri("$PERIODS/$period/result").exchange()

    private fun createMovement(name: String, type: String, value: String, period: String, paid: Boolean = false): ResponseSpec {

        val classification = if (type == "INCOME") INCOME else EXPENSE
        val payment = if (paid) """, "payment": {"wallet": "$WALLET"}""" else ""

        return restTestClient.post()
            .uri("/private/v1/financial/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "$name", "type": "$type", "value": $value, "financialPeriod": "$period",
                 "classification": "$classification", "costCenter": "$COST_CENTER"$payment}
                """.trimIndent()
            )
            .exchange()
    }

    companion object {
        private const val PERIODS = "/private/v1/financial/financial-periods"
        private const val DECEMBER = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val JULY = "6531c609-577b-4a45-82a9-debe0b53eeab"
        private const val AUGUST = "6248abb7-a8ad-4d2b-a0a4-0417b98cb008"
        private const val EXPENSE = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val INCOME = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
        private const val COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val OTHER_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a05"
        private const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
        private const val INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e01"
        private const val PURCHASE = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c01"
    }
}
