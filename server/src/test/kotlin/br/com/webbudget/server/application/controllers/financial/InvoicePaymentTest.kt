package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
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
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-card-purchases.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class InvoicePaymentTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require the financial role to close an invoice`() {

        authenticateWithRoles("REGISTRATION")

        close(OPEN_INVOICE).expectStatus().isForbidden
    }

    @Test
    fun `should close the invoice creating the payment without cost center and classification`() {

        close(OPEN_INVOICE)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("CLOSED")
            .jsonPath("$.value").isEqualTo(125.5)

        val payment = dsl.selectFrom(MOVEMENTS).fetchSingle()

        assertThat(payment.name).isEqualTo("Financial test card - Financial test 12/2024")
        assertThat(payment.type).isEqualTo("EXPENSE")
        assertThat(payment.value).isEqualByComparingTo("125.50")
        assertThat(payment.status).isEqualTo("OPEN")
        assertThat(payment.dueDate).isEqualTo(LocalDate.of(2025, 1, 10))
        assertThat(payment.idClassification).isNull()
        assertThat(payment.idCostCenter).isNull()
        assertThat(payment.idInvoice).isEqualTo(9101L)
        assertThat(payment.idFinancialPeriod).isEqualTo(9101L)

        restTestClient.get()
            .uri("$MOVEMENTS_URL/${payment.externalId}")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.classification").doesNotExist()
            .jsonPath("$.costCenter").doesNotExist()
            .jsonPath("$.invoice.id").isEqualTo(OPEN_INVOICE)
            .jsonPath("$.invoice.status").isEqualTo("CLOSED")
            .jsonPath("$.invoice.card.name").isEqualTo("Financial test card")
    }

    @Test
    fun `should show the due date and the payment on the invoice once it is closed`() {

        close(OPEN_INVOICE)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.dueDate").isEqualTo("2025-01-10")
            .jsonPath("$.purchaseCount").isEqualTo(2)
            .jsonPath("$.payment.id").isEqualTo(paymentId())
            .jsonPath("$.payment.name").isEqualTo("Financial test card - Financial test 12/2024")
            .jsonPath("$.payment.value").isEqualTo(125.5)

        restTestClient.get()
            .uri("$INVOICES_URL/$OPEN_INVOICE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.dueDate").isEqualTo("2025-01-10")
            .jsonPath("$.payment.id").isEqualTo(paymentId())
    }

    @Test
    fun `should refuse to close an invoice that is closed, empty or of a closed period`() {

        close(CLOSED_INVOICE)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invoice-not-open")

        close(EMPTY_INVOICE)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invoice-without-purchases")

        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "CLOSED").where(FINANCIAL_PERIODS.ID.eq(9101L)).execute()

        close(OPEN_INVOICE)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-not-open")

        assertThat(dsl.fetchCount(MOVEMENTS)).isZero()
    }

    @Test
    fun `should answer not found when closing an unknown invoice`() {

        close(UUID.randomUUID().toString()).expectStatus().isNotFound
    }

    @Test
    fun `should refuse purchases once the invoice is closed`() {

        close(OPEN_INVOICE).expectStatus().isOk

        restTestClient.post()
            .uri("/private/v1/financial/card-purchases")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "Late", "value": 10, "card": "$CARD", "financialPeriod": "$OPEN_PERIOD",
                    "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}"""
            )
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("no-open-invoice")
    }

    @Test
    fun `should reopen the invoice when its payment is deleted`() {

        close(OPEN_INVOICE).expectStatus().isOk

        restTestClient.delete()
            .uri("$MOVEMENTS_URL/${paymentId()}")
            .exchange()
            .expectStatus().isOk

        assertThat(dsl.fetchCount(MOVEMENTS)).isZero()
        assertThat(invoiceStatus()).isEqualTo("OPEN")

        restTestClient.post()
            .uri("/private/v1/financial/card-purchases")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "Back", "value": 10, "card": "$CARD", "financialPeriod": "$OPEN_PERIOD",
                    "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}"""
            )
            .exchange()
            .expectStatus().isCreated
    }

    @Test
    fun `should pay the invoice by wallet counting its value once in the result`() {

        close(OPEN_INVOICE).expectStatus().isOk

        pay(paymentId(), """{"wallet": "$WALLET"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PAID")
            .jsonPath("$.invoice.status").isEqualTo("PAID")

        assertThat(invoiceStatus()).isEqualTo("PAID")
        assertThat(dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(9101L)).fetchSingle().value1())
            .isEqualByComparingTo("-125.50")

        val entry = dsl.selectFrom(WALLET_ENTRIES).fetchSingle()

        assertThat(entry.origin).isEqualTo("INVOICE_PAYMENT")
        assertThat(entry.name).isEqualTo("Fatura Financial test card, dezembro")
        assertThat(entry.direction).isEqualTo("DEBIT")
        assertThat(entry.value).isEqualByComparingTo("125.50")

        restTestClient.get()
            .uri("/private/v1/financial/financial-periods/$OPEN_PERIOD/result")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.expenses").isEqualTo(125.5)
            .jsonPath("$.result").isEqualTo(-125.5)
    }

    @Test
    fun `should go back to closed when the payment of the invoice is undone`() {

        close(OPEN_INVOICE).expectStatus().isOk
        pay(paymentId(), """{"wallet": "$WALLET"}""").expectStatus().isOk

        restTestClient.delete()
            .uri("$MOVEMENTS_URL/${paymentId()}")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("movement-already-paid")

        restTestClient.patch()
            .uri("$MOVEMENTS_URL/${paymentId()}/undo-payment")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("OPEN")
            .jsonPath("$.invoice.status").isEqualTo("CLOSED")

        assertThat(invoiceStatus()).isEqualTo("CLOSED")
        assertThat(dsl.selectFrom(WALLET_ENTRIES).fetch().map { it.origin }).containsExactlyInAnyOrder("INVOICE_PAYMENT", "REVERSAL")
        assertThat(dsl.selectFrom(WALLET_ENTRIES).fetch().map { it.name }).containsOnly("Fatura Financial test card, dezembro")
        assertThat(dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(9101L)).fetchSingle().value1())
            .isEqualByComparingTo("0")
    }

    @Test
    fun `should refuse to pay the invoice by card and to edit its payment`() {

        close(OPEN_INVOICE).expectStatus().isOk

        pay(paymentId(), """{"card": "$CARD"}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invoice-payment-not-payable-by-card")

        restTestClient.put()
            .uri("$MOVEMENTS_URL/${paymentId()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "Other", "value": 1, "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}"""
            )
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invoice-payment-locked")
    }

    @Test
    fun `should filter the movements by the invoice payments`() {

        close(OPEN_INVOICE).expectStatus().isOk

        restTestClient.post()
            .uri(MOVEMENTS_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "Common", "type": "EXPENSE", "value": 10, "financialPeriod": "$OPEN_PERIOD",
                    "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH_COST_CENTER"}"""
            )
            .exchange()
            .expectStatus().isCreated

        assertTotal("invoicePayments=true", 1)
        assertTotal("invoicePayments=false", 1)
        assertTotal("", 2)

        restTestClient.get()
            .uri("$MOVEMENTS_URL?sort=name,asc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Common")
            .jsonPath("$.content[0].invoicePayment").isEqualTo(false)
            .jsonPath("$.content[1].invoicePayment").isEqualTo(true)
    }

    private fun assertTotal(query: String, expected: Int) {
        restTestClient.get()
            .uri("$MOVEMENTS_URL?$query")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(expected)
    }

    private fun close(invoice: String) = restTestClient.patch()
        .uri("$INVOICES_URL/$invoice/close")
        .exchange()

    private fun pay(movement: String, body: String) = restTestClient.patch()
        .uri("$MOVEMENTS_URL/$movement/pay")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun paymentId(): String = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID_INVOICE.isNotNull).fetchSingle().externalId.toString()

    private fun invoiceStatus(): String = dsl.selectFrom(INVOICES).where(INVOICES.ID.eq(9101L)).fetchSingle().status!!

    companion object {
        private const val INVOICES_URL = "/private/v1/financial/invoices"
        private const val MOVEMENTS_URL = "/private/v1/financial/movements"

        private const val OPEN_INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e01"
        private const val CLOSED_INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e02"
        private const val EMPTY_INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e03"

        private const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val EXPENSE_CLASSIFICATION = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val HEALTH_COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
    }
}
