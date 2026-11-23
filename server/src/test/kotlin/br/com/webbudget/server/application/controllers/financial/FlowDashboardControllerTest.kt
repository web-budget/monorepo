package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql", "/sql/financial/create-registration-data.sql")
@Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class FlowDashboardControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require the dashboards role`() {

        authenticateWithRoles("FINANCIAL")

        flow(2024).expectStatus().isForbidden

        authenticateWithRoles("DASHBOARDS")

        flow(2024).expectStatus().isOk

        authenticateAnonymously()

        flow(2024).expectStatus().isUnauthorized
    }

    @Test
    fun `should list the periods of the year in chronological order with the recorded and the provisional results`() {

        insertPeriod(9104L, "12/2023-01/2024", "2023-12-15", "2024-01-14", "CLOSED")
        insertRecordedResult(9102L, "10000.00", "5000.00")
        insertRecordedResult(9104L, "100.00", "40.00")

        createMovement("Salary", "INCOME", "8000.00", AUGUST)
        createMovement("Rent", "EXPENSE", "2500.00", AUGUST)
        createMovement("Gift", "INCOME", "300.00", DECEMBER)
        createMovement("Open bill", "EXPENSE", "70.00", DECEMBER, paid = false)

        flow(2024)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.year").isEqualTo(2024)
            .jsonPath("$.periods.length()").isEqualTo(4)
            .jsonPath("$.periods[0].financialPeriod.name").isEqualTo("12/2023-01/2024")
            .jsonPath("$.periods[0].recorded").isEqualTo(true)
            .jsonPath("$.periods[0].revenues").isEqualTo(100.0)
            .jsonPath("$.periods[0].result").isEqualTo(60.0)
            .jsonPath("$.periods[1].financialPeriod.name").isEqualTo("Financial test 07/2024")
            .jsonPath("$.periods[1].recorded").isEqualTo(true)
            .jsonPath("$.periods[1].expenses").isEqualTo(5000.0)
            .jsonPath("$.periods[2].financialPeriod.name").isEqualTo("Financial test 08/2024")
            .jsonPath("$.periods[2].recorded").isEqualTo(false)
            .jsonPath("$.periods[2].revenues").isEqualTo(8000.0)
            .jsonPath("$.periods[2].expenses").isEqualTo(2500.0)
            .jsonPath("$.periods[2].result").isEqualTo(5500.0)
            .jsonPath("$.periods[3].financialPeriod.name").isEqualTo("Financial test 12/2024")
            .jsonPath("$.periods[3].revenues").isEqualTo(300.0)
            .jsonPath("$.periods[3].expenses").isEqualTo(0)
            .jsonPath("$.totals.revenues").isEqualTo(18400.0)
            .jsonPath("$.totals.expenses").isEqualTo(7540.0)
            .jsonPath("$.totals.result").isEqualTo(10860.0)
    }

    @Test
    fun `should follow the closing and the reopening of a period`() {

        createMovement("Salary", "INCOME", "1000.00", AUGUST)

        flow(2024).expectBody().jsonPath("$.periods[1].financialPeriod.name").isEqualTo("Financial test 08/2024")
            .jsonPath("$.periods[1].recorded").isEqualTo(false)

        restTestClient.patch().uri("/private/v1/financial/financial-periods/$AUGUST/close").exchange().expectStatus().isOk

        flow(2024).expectBody().jsonPath("$.periods[1].recorded").isEqualTo(true)
            .jsonPath("$.periods[1].revenues").isEqualTo(1000.0)

        restTestClient.patch().uri("/private/v1/financial/financial-periods/$AUGUST/reopen").exchange().expectStatus().isOk

        flow(2024).expectBody().jsonPath("$.periods[1].recorded").isEqualTo(false)
    }

    @Test
    fun `should answer an empty year with zeros and use the current year by default`() {

        flow(2031)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.periods.length()").isEqualTo(0)
            .jsonPath("$.totals.revenues").isEqualTo(0)
            .jsonPath("$.totals.result").isEqualTo(0)

        restTestClient.get().uri(ENDPOINT_URL).exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.year").isEqualTo(LocalDate.now().year)
    }

    @Test
    fun `should refuse an invalid year`() {

        flow(1800).expectStatus().isBadRequest
        restTestClient.get().uri("$ENDPOINT_URL?year=abc").exchange().expectStatus().isBadRequest
    }

    private fun flow(year: Int): ResponseSpec = restTestClient.get().uri("$ENDPOINT_URL?year=$year").exchange()

    private fun insertPeriod(id: Long, name: String, startingAt: String, endingAt: String, status: String) {
        dsl.insertInto(FINANCIAL_PERIODS)
            .set(FINANCIAL_PERIODS.ID, id)
            .set(FINANCIAL_PERIODS.EXTERNAL_ID, UUID.randomUUID())
            .set(FINANCIAL_PERIODS.VERSION, 0.toShort())
            .set(FINANCIAL_PERIODS.CREATED_ON, LocalDateTime.now())
            .set(FINANCIAL_PERIODS.NAME, name)
            .set(FINANCIAL_PERIODS.STARTING_AT, LocalDate.parse(startingAt))
            .set(FINANCIAL_PERIODS.ENDING_AT, LocalDate.parse(endingAt))
            .set(FINANCIAL_PERIODS.STATUS, status)
            .execute()
    }

    private fun insertRecordedResult(financialPeriodId: Long, revenues: String, expenses: String) {
        dsl.execute(
            """
            INSERT INTO financial.period_results (external_id, version, created_on, id_financial_period, revenues, expenses, result)
            VALUES (gen_random_uuid(), 0, now(), ?, ?::numeric, ?::numeric, ?::numeric - ?::numeric)
            """.trimIndent(),
            financialPeriodId, revenues, expenses, revenues, expenses
        )
    }

    private fun createMovement(name: String, type: String, value: String, period: String, paid: Boolean = true) {

        val classification = if (type == "INCOME") INCOME else EXPENSE
        val payment = if (paid) """, "payment": {"wallet": "$WALLET"}""" else ""

        restTestClient.post()
            .uri("/private/v1/financial/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "$name", "type": "$type", "value": $value, "financialPeriod": "$period",
                 "classification": "$classification", "costCenter": "$COST_CENTER"$payment}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isCreated
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/dashboards/financial-flow"
        private const val DECEMBER = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val AUGUST = "6248abb7-a8ad-4d2b-a0a4-0417b98cb008"
        private const val EXPENSE = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val INCOME = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
        private const val COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
    }
}
