package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.DSLContext
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.context.jdbc.SqlMergeMode
import org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql", "/sql/financial/create-registration-data.sql")
@Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
@SqlMergeMode(MERGE)
class OverviewDashboardControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require the dashboards role`() {

        authenticateWithRoles("FINANCIAL")

        overview("2024").expectStatus().isForbidden

        authenticateWithRoles("DASHBOARDS")

        overview("2024").expectStatus().isOk

        authenticateAnonymously()

        overview("2024").expectStatus().isUnauthorized
    }

    @Test
    fun `should list the periods of the year with the recorded and the provisional results`() {

        insertPeriod(9104L, "12/2023-01/2024", "2023-12-15", "2024-01-14", "CLOSED")
        insertRecordedResult(9102L, "10000.00", "5000.00")
        insertRecordedResult(9104L, "100.00", "40.00")

        createMovement("Salary", "INCOME", "8000.00", AUGUST)
        createMovement("Rent", "EXPENSE", "2500.00", AUGUST)
        createMovement("Gift", "INCOME", "300.00", DECEMBER)
        createMovement("Open bill", "EXPENSE", "70.00", DECEMBER, paid = false)

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.cut").isEqualTo("2024")
            .jsonPath("$.years.length()").isEqualTo(1)
            .jsonPath("$.years[0]").isEqualTo(2024)
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
            .jsonPath("$.totals.savingsRate").isEqualTo(0.5902)
            .jsonPath("$.totals.periodsWithMovement").isEqualTo(4)
            .jsonPath("$.totals.redPeriods").isEqualTo(0)
            .jsonPath("$.resultByYear.length()").isEqualTo(1)
            .jsonPath("$.resultByYear[0].year").isEqualTo(2024)
            .jsonPath("$.resultByYear[0].result").isEqualTo(10860.0)
            .jsonPath("$.resultByYear[0].provisional").isEqualTo(true)
    }

    @Test
    fun `should sum every period for all and keep the result by year whatever the cut`() {

        insertPeriod(9105L, "03/2025", "2025-03-01", "2025-03-31", "CLOSED")
        insertRecordedResult(9102L, "10000.00", "5000.00")
        insertRecordedResult(9105L, "1000.00", "1500.00")

        createMovement("Salary", "INCOME", "8000.00", AUGUST)
        createMovement("Rent", "EXPENSE", "2500.00", AUGUST)

        overview("all")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.cut").isEqualTo("all")
            .jsonPath("$.years.length()").isEqualTo(2)
            .jsonPath("$.years[0]").isEqualTo(2024)
            .jsonPath("$.years[1]").isEqualTo(2025)
            .jsonPath("$.periods.length()").isEqualTo(4)
            .jsonPath("$.totals.revenues").isEqualTo(19000.0)
            .jsonPath("$.totals.expenses").isEqualTo(9000.0)
            .jsonPath("$.totals.result").isEqualTo(10000.0)
            .jsonPath("$.totals.redPeriods").isEqualTo(1)
            .jsonPath("$.totals.periodsWithMovement").isEqualTo(3)
            .jsonPath("$.resultByYear.length()").isEqualTo(2)
            .jsonPath("$.resultByYear[0].year").isEqualTo(2024)
            .jsonPath("$.resultByYear[0].result").isEqualTo(10500.0)
            .jsonPath("$.resultByYear[0].savingsRate").isEqualTo(0.5833)
            .jsonPath("$.resultByYear[0].provisional").isEqualTo(true)
            .jsonPath("$.resultByYear[1].year").isEqualTo(2025)
            .jsonPath("$.resultByYear[1].result").isEqualTo(-500.0)
            .jsonPath("$.resultByYear[1].savingsRate").isEqualTo(-0.5)
            .jsonPath("$.resultByYear[1].provisional").isEqualTo(false)

        overview("2025")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.cut").isEqualTo("2025")
            .jsonPath("$.periods.length()").isEqualTo(1)
            .jsonPath("$.totals.result").isEqualTo(-500.0)
            .jsonPath("$.resultByYear.length()").isEqualTo(2)
    }

    @Test
    fun `should leave the savings rate empty without revenues`() {

        insertRecordedResult(9102L, "0.00", "200.00")

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totals.revenues").isEqualTo(0)
            .jsonPath("$.totals.expenses").isEqualTo(200.0)
            .jsonPath("$.totals.savingsRate").isEmpty
            .jsonPath("$.resultByYear[0].savingsRate").isEmpty
    }

    @Test
    fun `should count in the red only the periods with movement`() {

        insertRecordedResult(9102L, "100.00", "300.00")
        insertRecordedResult(9101L, "0.00", "0.00")
        insertPeriod(9104L, "01/2024", "2024-01-01", "2024-01-31", "CLOSED")
        insertRecordedResult(9104L, "500.00", "100.00")

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.periods.length()").isEqualTo(4)
            .jsonPath("$.totals.periodsWithMovement").isEqualTo(2)
            .jsonPath("$.totals.redPeriods").isEqualTo(1)
    }

    @Test
    fun `should follow the closing and the reopening of a period`() {

        createMovement("Salary", "INCOME", "1000.00", AUGUST)

        overview("2024").expectBody().jsonPath("$.periods[1].financialPeriod.name").isEqualTo("Financial test 08/2024")
            .jsonPath("$.periods[1].recorded").isEqualTo(false)

        restTestClient.patch().uri("/private/v1/financial/financial-periods/$AUGUST/close").exchange().expectStatus().isOk

        overview("2024").expectBody().jsonPath("$.periods[1].recorded").isEqualTo(true)
            .jsonPath("$.periods[1].revenues").isEqualTo(1000.0)

        restTestClient.patch().uri("/private/v1/financial/financial-periods/$AUGUST/reopen").exchange().expectStatus().isOk

        overview("2024").expectBody().jsonPath("$.periods[1].recorded").isEqualTo(false)
    }

    @Test
    fun `should answer an empty year with zeros and use the current year by default`() {

        overview("2031")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.periods.length()").isEqualTo(0)
            .jsonPath("$.totals.revenues").isEqualTo(0)
            .jsonPath("$.totals.result").isEqualTo(0)
            .jsonPath("$.totals.savingsRate").isEmpty
            .jsonPath("$.totals.periodsWithMovement").isEqualTo(0)

        restTestClient.get().uri(ENDPOINT_URL).exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.cut").isEqualTo(LocalDate.now().year.toString())
    }

    @Test
    fun `should refuse an invalid year`() {

        overview("1800").expectStatus().isBadRequest
        overview("10000").expectStatus().isBadRequest
        overview("abc").expectStatus().isBadRequest
    }

    @AfterEach
    fun clearInstanceSettings() {
        dsl.execute("DELETE FROM administration.instance_settings")
    }

    @Test
    fun `should take the cost of living from the median of the last twelve closed periods`() {

        (1..12).forEach { month -> closedPeriodWithExpense(month, month * 100) }

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.costOfLiving.value").isEqualTo(650.0)
            .jsonPath("$.costOfLiving.basedOn").isEqualTo(12)
            .jsonPath("$.reserve.months").isEqualTo(6)
            .jsonPath("$.reserve.ideal").isEqualTo(3900.0)
    }

    @Test
    fun `should use the closed periods there are when they are fewer than twelve`() {

        (1..6).forEach { month -> closedPeriodWithExpense(month, month * 100) }

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.costOfLiving.value").isEqualTo(300.0)
            .jsonPath("$.costOfLiving.basedOn").isEqualTo(7)
    }

    @Test
    fun `should keep the cost of living whatever the cut`() {

        (1..12).forEach { month -> closedPeriodWithExpense(month, month * 100) }

        overview("2024").expectBody().jsonPath("$.costOfLiving.value").isEqualTo(650.0)
        overview("all").expectBody().jsonPath("$.costOfLiving.value").isEqualTo(650.0)
        overview("2031").expectBody().jsonPath("$.costOfLiving.value").isEqualTo(650.0)
    }

    @Test
    fun `should leave the cost of living and the ideal reserve empty without a closed period`() {

        dsl.execute("UPDATE registration.financial_periods SET status = 'OPEN' WHERE id = 9102")

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.costOfLiving.value").isEmpty
            .jsonPath("$.costOfLiving.basedOn").isEqualTo(0)
            .jsonPath("$.reserve.months").isEqualTo(6)
            .jsonPath("$.reserve.ideal").isEmpty
    }

    @Test
    @Sql("/sql/financial/create-compartments.sql")
    fun `should sum the reserve compartments of every wallet and compare it with the ideal one`() {

        (1..12).forEach { month -> closedPeriodWithExpense(month, month * 100) }

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reserve.current").isEqualTo(1200.0)
            .jsonPath("$.reserve.ideal").isEqualTo(3900.0)

        restTestClient.put()
            .uri("/private/v1/administration/settings")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"reserveMonths": 1}""")
            .exchange()
            .expectStatus().isOk

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reserve.current").isEqualTo(1200.0)
            .jsonPath("$.reserve.months").isEqualTo(1)
            .jsonPath("$.reserve.ideal").isEqualTo(650.0)
    }

    @Test
    fun `should have no residue when the difference is the net of the adjustments`() {

        createMovement("Salary", "INCOME", "1000.00", AUGUST)
        reconcile(informedBalance = "1100.00", shownBalance = "1000.00")
        reconcile(informedBalance = "1050.00", shownBalance = "1100.00")

        overview(LocalDate.now().year.toString())
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accumulated").isEqualTo(1000.0)
            .jsonPath("$.reliability.accumulated").isEqualTo(1000.0)
            .jsonPath("$.reliability.balancesTotal").isEqualTo(1050.0)
            .jsonPath("$.reliability.walletCount").isEqualTo(3)
            .jsonPath("$.reliability.difference").isEqualTo(50.0)
            .jsonPath("$.reliability.adjustmentsTotal").isEqualTo(50.0)
            .jsonPath("$.reliability.residue").isEqualTo(0)
            .jsonPath("$.reliability.adjustments.count").isEqualTo(2)
            .jsonPath("$.reliability.adjustments.credited").isEqualTo(100.0)
            .jsonPath("$.reliability.adjustments.debited").isEqualTo(50.0)
    }

    @Test
    @Sql("/sql/financial/create-compartments.sql")
    fun `should count the compartments in the balances total of every wallet, active or not`() {

        dsl.execute("UPDATE registration.wallets SET current_balance = 100.00 WHERE id IN (9101, 9102)")

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reliability.balancesTotal").isEqualTo(3350.0)
            .jsonPath("$.reliability.walletCount").isEqualTo(3)
    }

    @Test
    fun `should show the residue when the balances do not match the adjustments`() {

        createMovement("Salary", "INCOME", "1000.00", AUGUST)
        reconcile(informedBalance = "1100.00", shownBalance = "1000.00")
        dsl.execute("UPDATE registration.wallets SET current_balance = current_balance + 7.00 WHERE id = 9101")

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reliability.difference").isEqualTo(107.0)
            .jsonPath("$.reliability.adjustmentsTotal").isEqualTo(100.0)
            .jsonPath("$.reliability.residue").isEqualTo(7.0)
    }

    @Test
    fun `should count the adjustments of the cut by their date and the total whatever the cut`() {

        createMovement("Salary", "INCOME", "1000.00", AUGUST)
        reconcile(informedBalance = "1100.00", shownBalance = "1000.00")

        overview("2020")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reliability.adjustments.count").isEqualTo(0)
            .jsonPath("$.reliability.adjustments.credited").isEqualTo(0)
            .jsonPath("$.reliability.adjustments.debited").isEqualTo(0)
            .jsonPath("$.reliability.adjustmentsTotal").isEqualTo(100.0)

        overview("all")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reliability.adjustments.count").isEqualTo(1)
    }

    @Test
    fun `should weigh only the generic classifications on the expenses of the cut`() {

        dsl.execute(
            """
            INSERT INTO registration.classifications (id, external_id, version, created_on, active, name, type, generic)
            VALUES (9104, '$OTHER_EXPENSE', 0, now(), true, 'Financial test other expense', 'EXPENSE', false)
            """.trimIndent()
        )
        dsl.execute("UPDATE registration.classifications SET generic = true WHERE id = 9101")

        createMovement("Misc", "EXPENSE", "300.00", AUGUST)
        createMovement("Groceries", "EXPENSE", "700.00", AUGUST, classification = OTHER_EXPENSE)
        createMovement("Salary", "INCOME", "5000.00", AUGUST)

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reliability.generic.value").isEqualTo(300.0)
            .jsonPath("$.reliability.generic.total").isEqualTo(1000.0)
            .jsonPath("$.reliability.generic.classifications.length()").isEqualTo(1)
            .jsonPath("$.reliability.generic.classifications[0].id").isEqualTo(EXPENSE)
            .jsonPath("$.reliability.generic.classifications[0].name").isEqualTo("Financial test gym")

        overview("2031")
            .expectBody()
            .jsonPath("$.reliability.generic.value").isEqualTo(0)
            .jsonPath("$.reliability.generic.total").isEqualTo(0)
    }

    @Test
    fun `should leave the generic classifications empty when none is marked`() {

        createMovement("Misc", "EXPENSE", "300.00", AUGUST)

        overview("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reliability.generic.value").isEqualTo(0)
            .jsonPath("$.reliability.generic.total").isEqualTo(300.0)
            .jsonPath("$.reliability.generic.classifications.length()").isEqualTo(0)
    }

    private fun overview(year: String): ResponseSpec = restTestClient.get().uri("$ENDPOINT_URL?year=$year").exchange()

    private fun reconcile(informedBalance: String, shownBalance: String) {
        restTestClient.post()
            .uri("/private/v1/financial/wallets/$WALLET/reconciliations")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"informedBalance": $informedBalance, "shownBalance": $shownBalance, "reason": "Bank statement"}""")
            .exchange()
            .expectStatus().isCreated
    }

    private fun closedPeriodWithExpense(month: Int, value: Int) {

        val id = 9200L + month
        val period = UUID.randomUUID()
        val startingAt = LocalDate.of(2025, month, 1)

        dsl.insertInto(FINANCIAL_PERIODS)
            .set(FINANCIAL_PERIODS.ID, id)
            .set(FINANCIAL_PERIODS.EXTERNAL_ID, period)
            .set(FINANCIAL_PERIODS.VERSION, 0.toShort())
            .set(FINANCIAL_PERIODS.CREATED_ON, LocalDateTime.now())
            .set(FINANCIAL_PERIODS.NAME, "Cost of living $month/2025")
            .set(FINANCIAL_PERIODS.STARTING_AT, startingAt)
            .set(FINANCIAL_PERIODS.ENDING_AT, startingAt.withDayOfMonth(startingAt.lengthOfMonth()))
            .set(FINANCIAL_PERIODS.STATUS, "OPEN")
            .execute()

        createMovement("Expense $month", "EXPENSE", "$value.00", period.toString())

        dsl.execute("UPDATE registration.financial_periods SET status = 'CLOSED' WHERE id = ?", id)
    }

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

    private fun createMovement(
        name: String,
        type: String,
        value: String,
        period: String,
        paid: Boolean = true,
        classification: String = if (type == "INCOME") INCOME else EXPENSE
    ) {

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
        private const val ENDPOINT_URL = "/private/v1/dashboards/overview"
        private const val DECEMBER = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val AUGUST = "6248abb7-a8ad-4d2b-a0a4-0417b98cb008"
        private const val OTHER_EXPENSE = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a09"
        private const val EXPENSE = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val INCOME = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
        private const val COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
    }
}
