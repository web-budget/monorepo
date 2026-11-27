package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.time.LocalDate

@Sql(
    "/sql/registration/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-card-purchases.sql"
)
@Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class CompositionDashboardControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require the dashboards role`() {

        authenticateWithRoles("FINANCIAL")

        composition("2024").expectStatus().isForbidden

        authenticateWithRoles("DASHBOARDS")

        composition("2024").expectStatus().isOk

        authenticateAnonymously()

        composition("2024").expectStatus().isUnauthorized
    }

    @Test
    fun `should total the expenses by subtree and by classification following the reports rule`() {

        seedYear2024()

        composition("2024")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.cut").isEqualTo("2024")
            .jsonPath("$.years.length()").isEqualTo(1)
            .jsonPath("$.expenses").isEqualTo(445.5)
            .jsonPath("$.revenues").isEqualTo(5200.0)
            .jsonPath("$.costCenters.length()").isEqualTo(3)
            .jsonPath("$.costCenters[0].id").isEqualTo(HEALTH)
            .jsonPath("$.costCenters[0].value").isEqualTo(305.5)
            .jsonPath("$.costCenters[0].parent").isEqualTo(null)
            .jsonPath("$.costCenters[1].id").isEqualTo(HOME)
            .jsonPath("$.costCenters[1].value").isEqualTo(140.0)
            .jsonPath("$.costCenters[2].name").isEqualTo("Financial test child")
            .jsonPath("$.costCenters[2].parent").isEqualTo(HEALTH)
            .jsonPath("$.costCenters[2].value").isEqualTo(40.0)
            .jsonPath("$.classifications.length()").isEqualTo(4)
            .jsonPath("$.classifications[0].name").isEqualTo("Financial test gym")
            .jsonPath("$.classifications[0].costCenter").isEqualTo(HEALTH)
            .jsonPath("$.classifications[0].value").isEqualTo(265.5)
            .jsonPath("$.classifications[1].costCenter").isEqualTo(HOME)
            .jsonPath("$.classifications[1].value").isEqualTo(80.0)
            .jsonPath("$.classifications[2].name").isEqualTo("Supermarket")
            .jsonPath("$.classifications[2].value").isEqualTo(60.0)
            .jsonPath("$.classifications[3].value").isEqualTo(40.0)
    }

    @Test
    fun `should list the income sources by classification`() {

        seedYear2024()

        composition("2024")
            .expectBody()
            .jsonPath("$.incomeSources.length()").isEqualTo(2)
            .jsonPath("$.incomeSources[0].name").isEqualTo("Financial test salary")
            .jsonPath("$.incomeSources[0].value").isEqualTo(5000.0)
            .jsonPath("$.incomeSources[1].name").isEqualTo("Freelance")
            .jsonPath("$.incomeSources[1].value").isEqualTo(200.0)
    }

    @Test
    fun `should give the value of the month in a year and null in a month without a period with movement`() {

        seedYear2024()

        composition("2024")
            .expectBody()
            .jsonPath("$.seasonality.length()").isEqualTo(2)
            .jsonPath("$.seasonality[0].name").isEqualTo("Financial test gym")
            .jsonPath("$.seasonality[0].months.length()").isEqualTo(12)
            .jsonPath("$.seasonality[0].months[0]").isEqualTo(null)
            .jsonPath("$.seasonality[0].months[6]").isEqualTo(140.0)
            .jsonPath("$.seasonality[0].months[7]").isEqualTo(120.0)
            .jsonPath("$.seasonality[0].months[11]").isEqualTo(125.5)
            .jsonPath("$.seasonality[1].name").isEqualTo("Supermarket")
            .jsonPath("$.seasonality[1].months[6]").isEqualTo(0)
            .jsonPath("$.seasonality[1].months[7]").isEqualTo(60.0)
            .jsonPath("$.seasonality[1].months[8]").isEqualTo(null)
    }

    @Test
    fun `should sum every period for all and average each calendar month over the years with data`() {

        seedYear2024()
        insertPeriod(9104L, "07/2025", LocalDate.of(2025, 7, 1), LocalDate.of(2025, 7, 31))
        paidMovement(9104L, "EXPENSE", "60.00", GYM_ID, HEALTH_ID)
        paidMovement(9104L, "EXPENSE", "20.00", SUPERMARKET_ID, HOME_ID)

        composition("all")
            .expectBody()
            .jsonPath("$.cut").isEqualTo("all")
            .jsonPath("$.years.length()").isEqualTo(2)
            .jsonPath("$.expenses").isEqualTo(525.5)
            .jsonPath("$.seasonality[0].months[6]").isEqualTo(100.0)
            .jsonPath("$.seasonality[0].months[7]").isEqualTo(120.0)
            .jsonPath("$.seasonality[0].months[11]").isEqualTo(125.5)
            .jsonPath("$.seasonality[1].months[6]").isEqualTo(10.0)
            .jsonPath("$.seasonality[1].months[7]").isEqualTo(60.0)

        composition("2025")
            .expectBody()
            .jsonPath("$.expenses").isEqualTo(80.0)
            .jsonPath("$.seasonality[0].months[6]").isEqualTo(60.0)
            .jsonPath("$.seasonality[0].months[7]").isEqualTo(null)
    }

    @Test
    fun `should answer an empty year with zeros and use the current year by default`() {

        composition("2031")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.expenses").isEqualTo(0)
            .jsonPath("$.revenues").isEqualTo(0)
            .jsonPath("$.costCenters.length()").isEqualTo(0)
            .jsonPath("$.classifications.length()").isEqualTo(0)
            .jsonPath("$.seasonality.length()").isEqualTo(0)
            .jsonPath("$.incomeSources.length()").isEqualTo(0)

        restTestClient.get().uri(ENDPOINT_URL).exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.cut").isEqualTo(LocalDate.now().year.toString())
    }

    @Test
    fun `should refuse an invalid year`() {

        composition("1800").expectStatus().isBadRequest
        composition("10000").expectStatus().isBadRequest
        composition("abc").expectStatus().isBadRequest
    }

    private fun seedYear2024() {

        insertCostCenter(CHILD_ID, "Financial test child", HEALTH_ID)
        insertClassification(SUPERMARKET_ID, "Supermarket", "EXPENSE")
        insertClassification(FREELANCE_ID, "Freelance", "INCOME")

        paidMovement(JULY_ID, "EXPENSE", "100.00", GYM_ID, HEALTH_ID)
        paidMovement(JULY_ID, "EXPENSE", "40.00", GYM_ID, CHILD_ID)
        paidMovement(JULY_ID, "INCOME", "5000.00", SALARY_ID, HEALTH_ID)
        paidMovement(AUGUST_ID, "EXPENSE", "60.00", SUPERMARKET_ID, HOME_ID)
        paidMovement(AUGUST_ID, "INCOME", "200.00", FREELANCE_ID, HOME_ID)
    }

    private fun composition(year: String): ResponseSpec =
        restTestClient.get().uri("$ENDPOINT_URL?year=$year").exchange()

    private fun insertPeriod(id: Long, name: String, startingAt: LocalDate, endingAt: LocalDate) {
        dsl.execute(
            """
            INSERT INTO registration.financial_periods (id, external_id, version, created_on, name, starting_at, ending_at, status)
            VALUES (?, gen_random_uuid(), 0, now(), ?, ?, ?, 'OPEN')
            """.trimIndent(),
            id, name, startingAt, endingAt
        )
    }

    private fun insertCostCenter(id: Long, name: String, parentId: Long) {
        dsl.execute(
            """
            INSERT INTO registration.cost_centers (id, external_id, version, created_on, last_update, active, name, full_name, id_parent)
            VALUES (?, gen_random_uuid(), 0, now(), now(), true, ?, ?, ?)
            """.trimIndent(),
            id, name, name, parentId
        )
    }

    private fun insertClassification(id: Long, name: String, type: String) {
        dsl.execute(
            """
            INSERT INTO registration.classifications (id, external_id, version, created_on, last_update, active, name, type)
            VALUES (?, gen_random_uuid(), 0, now(), now(), true, ?, ?)
            """.trimIndent(),
            id, name, type
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

    companion object {
        private const val ENDPOINT_URL = "/private/v1/dashboards/composition"
        private const val HEALTH = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val HOME = "bfe5413f-1cc6-46cb-967c-8a3b11046747"
        private const val HEALTH_ID = 9101L
        private const val HOME_ID = 9102L
        private const val CHILD_ID = 9104L
        private const val GYM_ID = 9101L
        private const val SALARY_ID = 9102L
        private const val SUPERMARKET_ID = 9104L
        private const val FREELANCE_ID = 9105L
        private const val JULY_ID = 9102L
        private const val AUGUST_ID = 9103L
    }
}
