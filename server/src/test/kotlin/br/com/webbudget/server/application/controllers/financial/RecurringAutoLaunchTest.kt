package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_LAUNCHES
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_MOVEMENTS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
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

@Sql("/sql/registration/clear-tables.sql", "/sql/financial/create-registration-data.sql")
@Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class RecurringAutoLaunchTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should launch the automatic recurring movements as open movements when a period is created`() {

        createRecurring("Streaming", "FIXED", "39.90")
        createRecurring("Electricity", "VARIABLE", "100.00")
        createRecurring("Gym", "FIXED", "120.00", autoLaunch = false)
        createRecurring("Old subscription", "FIXED", "10.00")
        deactivate(lastRecurringId(), "Old subscription")

        createPeriod("09/2024", "2024-09-01", "2024-09-30")
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.recurringLaunch.launched.length()").isEqualTo(2)
            .jsonPath("$.recurringLaunch.launched[0].movement.name").isEqualTo("Streaming")
            .jsonPath("$.recurringLaunch.launched[1].movement.name").isEqualTo("Electricity")
            .jsonPath("$.recurringLaunch.skipped.length()").isEqualTo(0)

        val movements = dsl.selectFrom(MOVEMENTS).orderBy(MOVEMENTS.ID).fetch()

        assertThat(movements.map { it.name }).containsExactly("Streaming", "Electricity")
        assertThat(movements.map { it.status }).containsOnly("OPEN")
        assertThat(movements.map { it.dueDate }).containsOnly(LocalDate.of(2024, 9, 30))
        assertThat(dsl.fetchCount(RECURRING_LAUNCHES)).isEqualTo(2)
    }

    @Test
    fun `should advance the installments with each new period and finish after the last one`() {

        createRecurring("Phone", "FIXED", "249.90", extra = """, "installments": 2""")

        createPeriod("09/2024", "2024-09-01", "2024-09-30")
            .expectBody().jsonPath("$.recurringLaunch.launched[0].movement.name").isEqualTo("Phone 1/2")

        createPeriod("10/2024", "2024-10-01", "2024-10-31")
            .expectBody().jsonPath("$.recurringLaunch.launched[0].movement.name").isEqualTo("Phone 2/2")

        createPeriod("11/2024", "2024-11-01", "2024-11-30")
            .expectBody().jsonPath("$.recurringLaunch.launched.length()").isEqualTo(0)

        assertThat(dsl.fetchCount(MOVEMENTS)).isEqualTo(2)
    }

    @Test
    fun `should start counting from the first installment of the recurring movement`() {

        createRecurring("Phone", "FIXED", "249.90", extra = """, "installments": 12, "firstInstallment": 5""")

        createPeriod("09/2024", "2024-09-01", "2024-09-30")
            .expectBody().jsonPath("$.recurringLaunch.launched[0].movement.name").isEqualTo("Phone 5/12")
    }

    @Test
    fun `should launch a variable recurring movement with the last paid value`() {

        createRecurring("Electricity", "VARIABLE", "100.00")

        createPeriod("09/2024", "2024-09-01", "2024-09-30")
            .expectBody().jsonPath("$.recurringLaunch.launched[0].movement.value").isEqualTo(100.0)

        val movement = dsl.selectFrom(MOVEMENTS).fetchSingle().externalId

        restTestClient.put()
            .uri("/private/v1/financial/movements/$movement")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Electricity", "value": 142.35, "classification": "$CLASSIFICATION", "costCenter": "$COST_CENTER"}""")
            .exchange()
            .expectStatus().isOk

        restTestClient.patch()
            .uri("/private/v1/financial/movements/$movement/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"wallet": "$WALLET"}""")
            .exchange()
            .expectStatus().isOk

        createPeriod("10/2024", "2024-10-01", "2024-10-31")
            .expectBody().jsonPath("$.recurringLaunch.launched[0].movement.value").isEqualTo(142.35)
    }

    @Test
    fun `should not create the period when a launch fails`() {

        createRecurring("Streaming", "FIXED", "39.90")

        dsl.update(CLASSIFICATIONS).set(CLASSIFICATIONS.ACTIVE, false).where(CLASSIFICATIONS.ID.eq(9101L)).execute()

        createPeriod("09/2024", "2024-09-01", "2024-09-30")
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("inactive-classification")

        assertThat(dsl.fetchCount(FINANCIAL_PERIODS, FINANCIAL_PERIODS.NAME.eq("09/2024"))).isZero()
        assertThat(dsl.fetchCount(MOVEMENTS)).isZero()
    }

    @Test
    fun `should create a period without any automatic recurring movement`() {

        createPeriod("09/2024", "2024-09-01", "2024-09-30")
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.recurringLaunch.launched.length()").isEqualTo(0)
    }

    private fun createPeriod(name: String, startingAt: String, endingAt: String): ResponseSpec = restTestClient.post()
        .uri("/private/v1/registration/financial-periods")
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"name": "$name", "startingAt": "$startingAt", "endingAt": "$endingAt", "revenuesGoal": 10, "expensesGoal": 5}""")
        .exchange()

    private fun createRecurring(
        name: String,
        valueKind: String,
        value: String,
        autoLaunch: Boolean = true,
        extra: String = ""
    ) {
        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "$name", "type": "EXPENSE", "valueKind": "$valueKind", "value": $value, "autoLaunch": $autoLaunch,
                 "classification": "$CLASSIFICATION", "costCenter": "$COST_CENTER"$extra}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isCreated
    }

    private fun deactivate(id: String, name: String) {
        restTestClient.put()
            .uri("$ENDPOINT_URL/$id")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "$name", "active": false, "autoLaunch": true,
                 "classification": "$CLASSIFICATION", "costCenter": "$COST_CENTER"}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isOk
    }

    private fun lastRecurringId(): String = dsl.select(
        RECURRING_MOVEMENTS.EXTERNAL_ID
    )
        .from(RECURRING_MOVEMENTS)
        .orderBy(RECURRING_MOVEMENTS.ID.desc())
        .limit(1)
        .fetchSingle()
        .value1()
        .toString()

    companion object {
        private const val ENDPOINT_URL = "/private/v1/financial/recurring-movements"
        private const val CLASSIFICATION = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
    }
}
