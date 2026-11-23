package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_LAUNCHES
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.time.LocalDate
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql", "/sql/financial/create-registration-data.sql")
@Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class MovementMoveTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should move to the next open period skipping the closed ones and the ones before`() {

        insertPeriod(9104L, "10/2024", "2024-10-01", "2024-10-31", "CLOSED", "a1000000-0000-4000-8000-000000009104")
        insertPeriod(9105L, "11/2024", "2024-11-01", "2024-11-30", "OPEN", "a1000000-0000-4000-8000-000000009105")

        val movement = createMovement("Water", "70.00", AUGUST, dueDate = "2024-08-20")

        move(movement)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.financialPeriod.id").isEqualTo("a1000000-0000-4000-8000-000000009105")
            .jsonPath("$.name").isEqualTo("Water")
            .jsonPath("$.value").isEqualTo(70.0)
            .jsonPath("$.dueDate").isEqualTo("2024-08-20")
            .jsonPath("$.status").isEqualTo("OPEN")
    }

    @Test
    fun `should move to any other open period, before or after`() {

        val movement = createMovement("Water", "70.00", DECEMBER)

        move(movement, AUGUST).expectStatus().isOk
            .expectBody().jsonPath("$.financialPeriod.id").isEqualTo(AUGUST)

        move(movement, DECEMBER).expectStatus().isOk
            .expectBody().jsonPath("$.financialPeriod.id").isEqualTo(DECEMBER)
    }

    @Test
    fun `should refuse an invalid move`() {

        val movement = createMovement("Water", "70.00", DECEMBER)

        move(movement, DECEMBER).expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("move-target-same-period")

        move(movement, JULY).expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("move-target-not-open")

        move(movement).expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("no-open-period-after")

        move(movement, UUID.randomUUID().toString()).expectStatus().isNotFound
        move(UUID.randomUUID().toString()).expectStatus().isNotFound

        pay(movement)

        move(movement, AUGUST).expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("movement-already-paid")

        val other = createMovement("Gas", "10.00", AUGUST)

        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "CLOSED").where(FINANCIAL_PERIODS.ID.eq(9103L)).execute()

        move(other, DECEMBER).expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("financial-period-not-open")
    }

    @Test
    fun `should keep the launch of a recurring movement in the period it was launched for`() {

        restTestClient.post()
            .uri("/private/v1/financial/recurring-movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "Streaming", "type": "EXPENSE", "valueKind": "FIXED", "value": 39.90, "autoLaunch": false,
                 "classification": "$EXPENSE", "costCenter": "$COST_CENTER"}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isCreated

        val recurring = dsl.selectFrom(br.com.webbudget.server.jooq.financial.tables.references.RECURRING_MOVEMENTS)
            .fetchSingle().externalId.toString()

        launch(AUGUST, recurring).expectBody().jsonPath("$.launched.length()").isEqualTo(1)
        launch(DECEMBER, recurring).expectBody().jsonPath("$.launched.length()").isEqualTo(1)

        val august = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID_FINANCIAL_PERIOD.eq(9103L)).fetchSingle().externalId.toString()

        move(august, DECEMBER).expectStatus().isOk

        assertThat(dsl.fetchCount(MOVEMENTS, MOVEMENTS.ID_FINANCIAL_PERIOD.eq(9101L))).isEqualTo(2)
        assertThat(dsl.fetchCount(RECURRING_LAUNCHES)).isEqualTo(2)

        launch(AUGUST, recurring).expectBody().jsonPath("$.skipped[0].reason").isEqualTo("already-launched-in-period")
    }

    @Test
    @Sql(
        "/sql/registration/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-invoices.sql",
        "/sql/financial/create-card-purchases.sql"
    )
    @Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should move the invoice payment but not delete it while it is in another period`() {

        restTestClient.patch().uri("/private/v1/financial/invoices/$INVOICE/close").exchange().expectStatus().isOk

        val payment = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID_INVOICE.isNotNull).fetchSingle().externalId.toString()

        move(payment, AUGUST).expectStatus().isOk
            .expectBody().jsonPath("$.financialPeriod.id").isEqualTo(AUGUST)

        restTestClient.delete().uri("/private/v1/financial/movements/$payment").exchange()
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("invoice-payment-moved")

        move(payment, DECEMBER).expectStatus().isOk

        restTestClient.delete().uri("/private/v1/financial/movements/$payment").exchange().expectStatus().isOk
    }

    @Test
    @Sql(
        "/sql/registration/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-invoices.sql",
        "/sql/financial/create-card-purchases.sql"
    )
    @Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should summarize what still blocks the closing and where the pending ones can go`() {

        createMovement("Water", "70.00", DECEMBER)
        createMovement("Salary", "1000.00", DECEMBER, type = "INCOME")

        summary(DECEMBER)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.canClose").isEqualTo(false)
            .jsonPath("$.openMovements.count").isEqualTo(2)
            .jsonPath("$.openMovements.expense").isEqualTo(70.0)
            .jsonPath("$.openMovements.income").isEqualTo(1000.0)
            .jsonPath("$.openInvoices.length()").isEqualTo(1)
            .jsonPath("$.openInvoices[0].value").isEqualTo(125.5)
            .jsonPath("$.openInvoices[0].card.name").isEqualTo("Financial test card")
            .jsonPath("$.emptyInvoices.length()").isEqualTo(1)
            .jsonPath("$.emptyInvoices[0].card.name").isEqualTo("Financial test other card")
            .jsonPath("$.nextOpenPeriod").doesNotExist()
            .jsonPath("$.targetPeriods.length()").isEqualTo(1)
            .jsonPath("$.targetPeriods[0].id").isEqualTo(AUGUST)

        summary(AUGUST)
            .expectBody()
            .jsonPath("$.nextOpenPeriod.id").isEqualTo(DECEMBER)
            .jsonPath("$.targetPeriods[0].id").isEqualTo(DECEMBER)
    }

    @Test
    @Sql(
        "/sql/registration/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-invoices.sql",
        "/sql/financial/create-card-purchases.sql"
    )
    @Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should close the period after paying or moving every pending one`() {

        val water = createMovement("Water", "70.00", DECEMBER)
        val salary = createMovement("Salary", "1000.00", DECEMBER, type = "INCOME")

        restTestClient.patch().uri("/private/v1/financial/invoices/$INVOICE/close").exchange().expectStatus().isOk
        val payment = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID_INVOICE.isNotNull).fetchSingle().externalId.toString()

        pay(salary)
        move(water, AUGUST).expectStatus().isOk
        move(payment, AUGUST).expectStatus().isOk

        summary(DECEMBER)
            .expectBody()
            .jsonPath("$.canClose").isEqualTo(true)
            .jsonPath("$.openMovements.count").isEqualTo(0)
            .jsonPath("$.openInvoices.length()").isEqualTo(0)

        restTestClient.patch().uri("$PERIODS/$DECEMBER/close").exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.revenues").isEqualTo(1000.0)
    }

    @Test
    fun `should summarize a period with nothing pending and answer not found for an unknown one`() {

        summary(AUGUST)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.canClose").isEqualTo(true)
            .jsonPath("$.openMovements.count").isEqualTo(0)
            .jsonPath("$.openMovements.income").isEqualTo(0)

        summary(UUID.randomUUID().toString()).expectStatus().isNotFound
    }

    @Test
    fun `should require the financial role`() {

        authenticateWithRoles("REGISTRATION")

        summary(AUGUST).expectStatus().isForbidden
        move(UUID.randomUUID().toString()).expectStatus().isForbidden
    }

    private fun insertPeriod(id: Long, name: String, startingAt: String, endingAt: String, status: String, externalId: String) {
        dsl.insertInto(FINANCIAL_PERIODS)
            .set(FINANCIAL_PERIODS.ID, id)
            .set(FINANCIAL_PERIODS.EXTERNAL_ID, UUID.fromString(externalId))
            .set(FINANCIAL_PERIODS.VERSION, 0.toShort())
            .set(FINANCIAL_PERIODS.CREATED_ON, java.time.LocalDateTime.now())
            .set(FINANCIAL_PERIODS.NAME, name)
            .set(FINANCIAL_PERIODS.STARTING_AT, LocalDate.parse(startingAt))
            .set(FINANCIAL_PERIODS.ENDING_AT, LocalDate.parse(endingAt))
            .set(FINANCIAL_PERIODS.STATUS, status)
            .execute()
    }

    private fun move(movement: String, target: String? = null): ResponseSpec {

        val request = restTestClient.patch().uri("/private/v1/financial/movements/$movement/move")

        return if (target == null) {
            request.exchange()
        } else {
            request.contentType(MediaType.APPLICATION_JSON).body("""{"financialPeriod": "$target"}""").exchange()
        }
    }

    private fun pay(movement: String) {
        restTestClient.patch().uri("/private/v1/financial/movements/$movement/pay")
            .contentType(MediaType.APPLICATION_JSON).body("""{"wallet": "$WALLET"}""").exchange()
            .expectStatus().isOk
    }

    private fun summary(period: String): ResponseSpec = restTestClient.get().uri("$PERIODS/$period/closing").exchange()

    private fun launch(period: String, recurring: String): ResponseSpec = restTestClient.post()
        .uri("/private/v1/financial/recurring-movements/launch")
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"financialPeriod": "$period", "recurringMovements": [{"id": "$recurring"}]}""")
        .exchange()

    private fun createMovement(name: String, value: String, period: String, type: String = "EXPENSE", dueDate: String? = null): String {

        val classification = if (type == "INCOME") INCOME else EXPENSE
        val due = dueDate?.let { """, "dueDate": "$it"""" } ?: ""

        restTestClient.post()
            .uri("/private/v1/financial/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "$name", "type": "$type", "value": $value, "financialPeriod": "$period",
                 "classification": "$classification", "costCenter": "$COST_CENTER"$due}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isCreated

        return dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq(name)).fetchSingle().externalId.toString()
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
        private const val INVOICE = "8f1d2b3c-4a5e-4c6d-9e7f-0a1b2c3d4e01"
    }
}
