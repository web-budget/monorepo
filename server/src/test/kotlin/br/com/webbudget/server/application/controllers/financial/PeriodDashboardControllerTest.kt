package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.time.LocalDate
import java.util.UUID

@Sql(
    "/sql/registration/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-card-purchases.sql"
)
@Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class PeriodDashboardControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require the dashboards role`() {

        authenticateWithRoles("FINANCIAL")

        period().expectStatus().isForbidden

        authenticateWithRoles("DASHBOARDS")

        period().expectStatus().isOk

        authenticateAnonymously()

        period().expectStatus().isUnauthorized
    }

    @Test
    fun `should default to the latest open period when none includes today`() {

        period()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.period.id").isEqualTo(DECEMBER)
            .jsonPath("$.period.name").isEqualTo("Financial test 12/2024")
            .jsonPath("$.period.status").isEqualTo("OPEN")
            .jsonPath("$.period.current").isEqualTo(true)
            .jsonPath("$.upcoming").isNotEmpty

        period(AUGUST)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.period.id").isEqualTo(AUGUST)
            .jsonPath("$.period.current").isEqualTo(false)
            .jsonPath("$.upcoming").isEmpty

        period(CLOSED_JULY)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.period.status").isEqualTo("CLOSED")
            .jsonPath("$.upcoming").isEmpty
    }

    @Test
    fun `should prefer the open period that includes today`() {

        val today = LocalDate.now()
        insertPeriod(9110L, "Includes today", today.minusDays(5), today.plusDays(5), "OPEN")

        period().expectBody()
            .jsonPath("$.period.name").isEqualTo("Includes today")
            .jsonPath("$.period.current").isEqualTo(true)
    }

    @Test
    fun `should fall back to the latest closed period without an open one`() {

        dsl.execute("UPDATE registration.financial_periods SET status = 'CLOSED'")

        period().expectBody()
            .jsonPath("$.period.id").isEqualTo(DECEMBER)
            .jsonPath("$.period.current").isEqualTo(true)
            .jsonPath("$.upcoming.items.length()").isEqualTo(0)
    }

    @Test
    fun `should answer not found for an unknown period and when there is no period`() {

        period(UUID.randomUUID().toString()).expectStatus().isNotFound

        dsl.execute("DELETE FROM financial.card_purchases")
        dsl.execute("DELETE FROM financial.invoices")
        dsl.execute("DELETE FROM registration.financial_periods")

        period().expectStatus().isNotFound
    }

    @Test
    fun `should compare the realized with the goals following the reports rule`() {

        paidMovement(DECEMBER_ID, "INCOME", "800.00", INCOME_CLASSIFICATION_ID, HEALTH_ID)
        paidMovement(DECEMBER_ID, "EXPENSE", "300.00", EXPENSE_CLASSIFICATION_ID, HEALTH_ID)
        paidMovement(AUGUST_ID, "EXPENSE", "999.00", EXPENSE_CLASSIFICATION_ID, HEALTH_ID)
        dsl.execute("UPDATE financial.payments SET discount = 20.00, value_paid = value - 20.00 WHERE value = 300.00")

        period().expectBody()
            .jsonPath("$.goals.revenues.realized").isEqualTo(800.0)
            .jsonPath("$.goals.revenues.goal").isEqualTo(9000.0)
            .jsonPath("$.goals.expenses.realized").isEqualTo(405.5)
            .jsonPath("$.goals.expenses.goal").isEqualTo(4500.0)
    }

    @Test
    fun `should count a movement paid by card once and leave the invoice payments out`() {

        createMovement("Gym", "EXPENSE", "50.00")
        payMovement("Gym", """{"card": "$CARD"}""")

        createMovement("Wallet gym", "EXPENSE", "10.00")
        payMovement("Wallet gym", """{"wallet": "$WALLET"}""")

        period().expectBody()
            .jsonPath("$.goals.expenses.realized").isEqualTo(185.5)

        dsl.execute(
            """
            INSERT INTO financial.movements (external_id, version, created_on, name, type, value, due_date, status, id_financial_period, id_invoice)
            VALUES (gen_random_uuid(), 0, now(), 'Invoice payment', 'EXPENSE', 125.50, current_date, 'PAID', 9101, 9101)
            """.trimIndent()
        )
        dsl.execute(
            """
            INSERT INTO financial.payments (external_id, version, created_on, method, paid_on, value, discount, value_paid, id_movement, id_wallet)
            SELECT gen_random_uuid(), 0, now(), 'WALLET', current_date, 125.50, 0, 125.50, id, 9101
            FROM financial.movements WHERE name = 'Invoice payment'
            """.trimIndent()
        )

        period().expectBody()
            .jsonPath("$.goals.expenses.realized").isEqualTo(185.5)
    }

    @Test
    fun `should split the fixed from the variable expenses with a purchase of an installment`() {

        createRecurring("Streaming", "200.00")
        createRecurring("Phone", "100.00")
        launch(DECEMBER)
        payMovement("Streaming", """{"wallet": "$WALLET"}""")
        payMovement("Phone", """{"card": "$CARD"}""")
        paidMovement(DECEMBER_ID, "EXPENSE", "40.00", EXPENSE_CLASSIFICATION_ID, HEALTH_ID)

        period().expectBody()
            .jsonPath("$.goals.expenses.realized").isEqualTo(465.5)
            .jsonPath("$.fixedVsVariable.fixed").isEqualTo(300.0)
            .jsonPath("$.fixedVsVariable.variable").isEqualTo(165.5)
            .jsonPath("$.fixedVsVariable.fixedShareOfRevenueGoal").isEqualTo(0.0333)
    }

    @Test
    fun `should leave the goals and the share empty without a goal`() {

        dsl.execute("UPDATE registration.financial_periods SET revenues_goal = NULL, expenses_goal = NULL")

        period().expectBody()
            .jsonPath("$.goals.revenues.goal").isEmpty
            .jsonPath("$.goals.expenses.goal").isEmpty
            .jsonPath("$.goals.expenses.realized").isEqualTo(125.5)
            .jsonPath("$.fixedVsVariable.fixedShareOfRevenueGoal").isEmpty
    }

    @Test
    fun `should use the subtree for the use of a cost center with parent and child budgeted`() {

        insertCostCenter(CHILD_ID, "Financial test child", HEALTH_ID, expenseBudget = "200.00", incomeBudget = null)
        insertCostCenter(GRANDCHILD_ID, "Financial test grandchild", CHILD_ID, expenseBudget = null, incomeBudget = "40.00")

        paidMovement(DECEMBER_ID, "EXPENSE", "100.00", EXPENSE_CLASSIFICATION_ID, HEALTH_ID)
        paidMovement(DECEMBER_ID, "EXPENSE", "150.00", EXPENSE_CLASSIFICATION_ID, CHILD_ID)
        paidMovement(DECEMBER_ID, "EXPENSE", "30.00", EXPENSE_CLASSIFICATION_ID, GRANDCHILD_ID)
        paidMovement(DECEMBER_ID, "INCOME", "700.00", INCOME_CLASSIFICATION_ID, CHILD_ID)
        paidMovement(DECEMBER_ID, "EXPENSE", "70.00", EXPENSE_CLASSIFICATION_ID, HOME_ID)

        val budget = period().expectBody()
            .jsonPath("$.budget.length()").isEqualTo(4)
            .jsonPath("$.budget[?(@.costCenter.id == '$HEALTH')].expense.budget").isEqualTo(800.0)
            .jsonPath("$.budget[?(@.costCenter.id == '$HEALTH')].expense.used").isEqualTo(325.5)

        budget
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test child')].expense.used").isEqualTo(180.0)
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test child')].expense.budget").isEqualTo(200.0)
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test child')].costCenter.parent").isEqualTo(HEALTH)
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test child')].income.used").isEqualTo(700.0)
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test child')].income.budget").isEqualTo(null)
            .jsonPath("$.budget[?(@.costCenter.id == '$HEALTH')].income.used").isEqualTo(700.0)
            .jsonPath("$.budget[?(@.costCenter.id == '$HEALTH')].income.budget").isEqualTo(1000.0)
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test grandchild')].expense.used").isEqualTo(30.0)
            .jsonPath("$.budget[?(@.costCenter.id == '$HOME')].expense.used").isEqualTo(150.0)
            .jsonPath("$.budget[?(@.costCenter.id == '$HOME')].expense.budget").isEqualTo(null)
    }

    @Test
    fun `should list the ancestors of a cost center that only has a budget`() {

        dsl.execute("UPDATE registration.cost_centers SET expense_budget = NULL, income_budget = NULL")
        insertCostCenter(CHILD_ID, "Financial test child", OLD_ID, expenseBudget = null, incomeBudget = null)
        insertCostCenter(GRANDCHILD_ID, "Financial test grandchild", CHILD_ID, expenseBudget = "50.00", incomeBudget = null)

        period().expectBody()
            .jsonPath("$.budget.length()").isEqualTo(5)
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test old')].costCenter.parent").isEqualTo(null)
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test child')].costCenter.parent").isEqualTo(OLD)
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test child')].expense.used").isEqualTo(0)
            .jsonPath("$.budget[?(@.costCenter.name == 'Financial test grandchild')].expense.budget").isEqualTo(50.0)
    }

    @Test
    fun `should leave the share empty when the revenue goal is zero`() {

        dsl.execute("UPDATE registration.financial_periods SET revenues_goal = 0")

        period().expectBody().jsonPath("$.fixedVsVariable.fixedShareOfRevenueGoal").isEqualTo(null)
    }

    @Test
    fun `should list a card without an invoice in the chosen period`() {

        insertPeriod(9110L, "Next year", LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 31), "OPEN")

        period(dsl.fetchValue("SELECT external_id FROM registration.financial_periods WHERE id = 9110").toString())
            .expectBody()
            .jsonPath("$.cards.length()").isEqualTo(1)
            .jsonPath("$.cards[0].invoiceId").isEqualTo(null)
            .jsonPath("$.cards[0].invoiceStatus").isEqualTo(null)
            .jsonPath("$.cards[0].purchases").isEqualTo(0)
            .jsonPath("$.cards[0].history.length()").isEqualTo(4)
    }

    @Test
    fun `should suggest the median of the last closed periods only with at least three`() {

        insertPeriod(9104L, "Closed 05/2024", LocalDate.of(2024, 5, 1), LocalDate.of(2024, 5, 31), "CLOSED")
        paidMovement(9102L, "EXPENSE", "100.00", EXPENSE_CLASSIFICATION_ID, HOME_ID)
        paidMovement(9104L, "EXPENSE", "300.00", EXPENSE_CLASSIFICATION_ID, HOME_ID)

        period().expectBody()
            .jsonPath("$.budget[?(@.costCenter.id == '$HOME')].expense.suggested").isEqualTo(null)
            .jsonPath("$.budget[?(@.costCenter.id == '$HEALTH')].expense.suggested").isEqualTo(null)

        insertPeriod(9105L, "Closed 03/2024", LocalDate.of(2024, 3, 1), LocalDate.of(2024, 3, 31), "CLOSED")
        paidMovement(9102L, "EXPENSE", "50.00", EXPENSE_CLASSIFICATION_ID, HEALTH_ID)
        paidMovement(9105L, "EXPENSE", "70.00", EXPENSE_CLASSIFICATION_ID, HEALTH_ID)
        paidMovement(9105L, "EXPENSE", "10.00", EXPENSE_CLASSIFICATION_ID, HOME_ID)

        period().expectBody()
            .jsonPath("$.budget[?(@.costCenter.id == '$HOME')].expense.suggested").isEqualTo(100.0)
            .jsonPath("$.budget[?(@.costCenter.id == '$HEALTH')].expense.suggested").isEqualTo(50.0)
            .jsonPath("$.budget[?(@.costCenter.id == '$HOME')].income.suggested").isEqualTo(null)

        period(AUGUST).expectBody()
            .jsonPath("$.budget[?(@.costCenter.id == '$HOME')].expense.suggested").isEqualTo(100.0)
    }

    @Test
    fun `should list the upcoming movements of any open period with the overdue first`() {

        val today = LocalDate.now()
        openMovement("Rent", "EXPENSE", "500.00", DECEMBER_ID, today.plusDays(10))
        openMovement("Late bill", "EXPENSE", "80.00", AUGUST_ID, today.minusDays(3))
        openMovement("Freelance", "INCOME", "300.00", DECEMBER_ID, today)
        openMovement("Far away", "EXPENSE", "999.00", DECEMBER_ID, today.plusDays(31))
        openMovement("Closed period", "EXPENSE", "111.00", 9102L, today)
        paidMovement(DECEMBER_ID, "EXPENSE", "5.00", EXPENSE_CLASSIFICATION_ID, HEALTH_ID)

        period().expectBody()
            .jsonPath("$.upcoming.items.length()").isEqualTo(3)
            .jsonPath("$.upcoming.items[0].name").isEqualTo("Late bill")
            .jsonPath("$.upcoming.items[0].overdue").isEqualTo(true)
            .jsonPath("$.upcoming.items[0].financialPeriod.id").isEqualTo(AUGUST)
            .jsonPath("$.upcoming.items[0].invoicePayment").isEqualTo(false)
            .jsonPath("$.upcoming.items[1].name").isEqualTo("Freelance")
            .jsonPath("$.upcoming.items[1].overdue").isEqualTo(false)
            .jsonPath("$.upcoming.items[2].name").isEqualTo("Rent")
            .jsonPath("$.upcoming.toReceive").isEqualTo(300.0)
            .jsonPath("$.upcoming.toPay").isEqualTo(580.0)

        period(AUGUST).expectBody().jsonPath("$.upcoming").isEmpty
    }

    @Test
    fun `should flag the invoice payments among the upcoming movements`() {

        dsl.execute(
            """
            INSERT INTO financial.movements (external_id, version, created_on, name, type, value, due_date, status, id_financial_period, id_invoice)
            VALUES (gen_random_uuid(), 0, now(), 'Invoice payment', 'EXPENSE', 125.50, current_date, 'OPEN', 9101, 9101)
            """.trimIndent()
        )

        period().expectBody()
            .jsonPath("$.upcoming.items[0].invoicePayment").isEqualTo(true)
            .jsonPath("$.upcoming.toPay").isEqualTo(125.5)
    }

    @Test
    fun `should total the card purchases of the period with the history of the window`() {

        period().expectBody()
            .jsonPath("$.cards.length()").isEqualTo(1)
            .jsonPath("$.cards[0].id").isEqualTo(CARD)
            .jsonPath("$.cards[0].lastFourDigits").isEqualTo("9101")
            .jsonPath("$.cards[0].invoiceStatus").isEqualTo("OPEN")
            .jsonPath("$.cards[0].purchases").isEqualTo(125.5)
            .jsonPath("$.cards[0].history.length()").isEqualTo(3)
            .jsonPath("$.cards[0].history[0].financialPeriod.name").isEqualTo("Financial test 07/2024")
            .jsonPath("$.cards[0].history[0].purchases").isEqualTo(0)
            .jsonPath("$.cards[0].history[1].financialPeriod.name").isEqualTo("Financial test 08/2024")
            .jsonPath("$.cards[0].history[1].purchases").isEqualTo(120.0)
            .jsonPath("$.cards[0].history[2].purchases").isEqualTo(125.5)

        period(AUGUST).expectBody()
            .jsonPath("$.cards[0].invoiceStatus").isEqualTo("CLOSED")
            .jsonPath("$.cards[0].purchases").isEqualTo(120.0)
            .jsonPath("$.cards[0].history.length()").isEqualTo(2)

        period(CLOSED_JULY).expectBody().jsonPath("$.cards.length()").isEqualTo(0)
    }

    private fun period(financialPeriod: String? = null): ResponseSpec {

        val query = financialPeriod?.let { "?financialPeriod=$it" } ?: ""

        return restTestClient.get().uri("$ENDPOINT_URL$query").exchange()
    }

    private fun insertPeriod(id: Long, name: String, startingAt: LocalDate, endingAt: LocalDate, status: String) {
        dsl.execute(
            """
            INSERT INTO registration.financial_periods (id, external_id, version, created_on, name, starting_at, ending_at, status)
            VALUES (?, gen_random_uuid(), 0, now(), ?, ?, ?, ?)
            """.trimIndent(),
            id, name, startingAt, endingAt, status
        )
    }

    private fun insertCostCenter(id: Long, name: String, parentId: Long, expenseBudget: String?, incomeBudget: String?) {
        dsl.execute(
            """
            INSERT INTO registration.cost_centers (id, external_id, version, created_on, last_update, active, name, full_name, id_parent, expense_budget, income_budget)
            VALUES (?, gen_random_uuid(), 0, now(), now(), true, ?, ?, ?, ?::numeric, ?::numeric)
            """.trimIndent(),
            id, name, name, parentId, expenseBudget, incomeBudget
        )
    }

    private fun paidMovement(periodId: Long, type: String, value: String, classificationId: Long, costCenterId: Long) {
        dsl.execute(
            """
            WITH inserted AS (
                INSERT INTO financial.movements (external_id, version, created_on, name, type, value, due_date, status, id_financial_period, id_classification, id_cost_center)
                VALUES (gen_random_uuid(), 0, now(), 'Paid movement', ?, ?::numeric, current_date, 'PAID', ?, ?, ?)
                RETURNING id
            )
            INSERT INTO financial.payments (external_id, version, created_on, method, paid_on, value, discount, value_paid, id_movement, id_wallet)
            SELECT gen_random_uuid(), 0, now(), 'WALLET', current_date, ?::numeric, 0, ?::numeric, id, 9101 FROM inserted
            """.trimIndent(),
            type, value, periodId, classificationId, costCenterId, value, value
        )
    }

    private fun openMovement(name: String, type: String, value: String, periodId: Long, dueDate: LocalDate) {
        dsl.execute(
            """
            INSERT INTO financial.movements (external_id, version, created_on, name, type, value, due_date, status, id_financial_period, id_classification, id_cost_center)
            VALUES (gen_random_uuid(), 0, now(), ?, ?, ?::numeric, ?, 'OPEN', ?, 9101, 9101)
            """.trimIndent(),
            name, type, value, dueDate, periodId
        )
    }

    private fun createMovement(name: String, type: String, value: String) {
        restTestClient.post()
            .uri("/private/v1/financial/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "$name", "type": "$type", "value": $value, "financialPeriod": "$DECEMBER",
                 "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH"}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isCreated
    }

    private fun payMovement(name: String, payment: String) {

        val id = dsl.fetchValue("SELECT external_id FROM financial.movements WHERE name LIKE ?", "$name%")

        restTestClient.patch()
            .uri("/private/v1/financial/movements/$id/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body(payment)
            .exchange()
            .expectStatus().isOk
    }

    private fun createRecurring(name: String, value: String) {
        restTestClient.post()
            .uri("/private/v1/financial/recurring-movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "$name", "type": "EXPENSE", "valueKind": "FIXED", "value": $value, "autoLaunch": false,
                 "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$HEALTH"}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isCreated
    }

    private fun launch(financialPeriod: String) {

        val ids = dsl.fetch("SELECT external_id FROM financial.recurring_movements ORDER BY id")
            .joinToString(",") { """{"id": "${it.get(0)}"}""" }

        restTestClient.post()
            .uri("/private/v1/financial/recurring-movements/launch")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"financialPeriod": "$financialPeriod", "recurringMovements": [$ids]}""")
            .exchange()
            .expectStatus().isOk
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/dashboards/period"
        private const val DECEMBER = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val CLOSED_JULY = "6531c609-577b-4a45-82a9-debe0b53eeab"
        private const val AUGUST = "6248abb7-a8ad-4d2b-a0a4-0417b98cb008"
        private const val DECEMBER_ID = 9101L
        private const val AUGUST_ID = 9103L
        private const val HEALTH = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val HEALTH_ID = 9101L
        private const val HOME = "bfe5413f-1cc6-46cb-967c-8a3b11046747"
        private const val HOME_ID = 9102L
        private const val OLD = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a04"
        private const val OLD_ID = 9103L
        private const val CHILD_ID = 9104L
        private const val GRANDCHILD_ID = 9105L
        private const val EXPENSE_CLASSIFICATION = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val EXPENSE_CLASSIFICATION_ID = 9101L
        private const val INCOME_CLASSIFICATION_ID = 9102L
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
    }
}
