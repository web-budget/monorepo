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
    fun `should give the value of the month in a year and null in a month without any line`() {

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
        paidMovement(9104L, "EXPENSE", "60.00", GYM_ID, HEALTH_ID, LocalDate.of(2025, 7, 12))
        paidMovement(9104L, "EXPENSE", "20.00", SUPERMARKET_ID, HOME_ID, LocalDate.of(2025, 7, 12))

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
    fun `should put each payment in its own month when the period crosses months`() {

        insertPeriod(9201L, "15/10 to 14/11", LocalDate.of(2026, 10, 15), LocalDate.of(2026, 11, 14))
        paidMovement(9201L, "EXPENSE", "30.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 10, 20))
        paidMovement(9201L, "EXPENSE", "70.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 11, 3))

        composition("2026")
            .expectBody()
            .jsonPath("$.seasonality.length()").isEqualTo(1)
            .jsonPath("$.seasonality[0].months[8]").isEqualTo(null)
            .jsonPath("$.seasonality[0].months[9]").isEqualTo(30.0)
            .jsonPath("$.seasonality[0].months[10]").isEqualTo(70.0)
            .jsonPath("$.seasonality[0].months[11]").isEqualTo(null)
            .jsonPath("$.expenses").isEqualTo(100.0)
    }

    @Test
    fun `should not add two periods ending in the same month`() {

        insertPeriod(9201L, "20/09 to 05/10", LocalDate.of(2026, 9, 20), LocalDate.of(2026, 10, 5))
        insertPeriod(9202L, "06/10 to 31/10", LocalDate.of(2026, 10, 6), LocalDate.of(2026, 10, 31))
        paidMovement(9201L, "EXPENSE", "50.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 9, 25))
        paidMovement(9202L, "EXPENSE", "70.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 10, 20))

        composition("2026")
            .expectBody()
            .jsonPath("$.seasonality[0].months[8]").isEqualTo(50.0)
            .jsonPath("$.seasonality[0].months[9]").isEqualTo(70.0)
            .jsonPath("$.expenses").isEqualTo(120.0)
    }

    @Test
    fun `should put a card purchase in the month of the purchase even when its period ends in the next year`() {

        insertPeriod(9201L, "01/2027", LocalDate.of(2027, 1, 1), LocalDate.of(2027, 1, 31))
        insertInvoice(9201L, 9101L, 9201L, "OPEN")
        insertCardPurchase(9201L, 9201L, "90.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 12, 28))

        composition("2026")
            .expectBody()
            .jsonPath("$.seasonality.length()").isEqualTo(1)
            .jsonPath("$.seasonality[0].months[10]").isEqualTo(null)
            .jsonPath("$.seasonality[0].months[11]").isEqualTo(90.0)
            .jsonPath("$.expenses").isEqualTo(0)

        composition("2027")
            .expectBody()
            .jsonPath("$.seasonality.length()").isEqualTo(0)
            .jsonPath("$.expenses").isEqualTo(90.0)
    }

    @Test
    fun `should count card purchases whatever the status of the invoice`() {

        insertPeriod(9201L, "03/2026", LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 31))
        insertInvoice(9201L, 9101L, 9201L, "OPEN")
        insertInvoice(9202L, 9102L, 9201L, "CLOSED")
        insertPeriod(9202L, "04/2026", LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 30))
        insertInvoice(9203L, 9101L, 9202L, "PAID")
        insertCardPurchase(9201L, 9201L, "10.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 3, 5))
        insertCardPurchase(9202L, 9202L, "20.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 3, 6))
        insertCardPurchase(9203L, 9203L, "40.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 3, 7))

        composition("2026")
            .expectBody()
            .jsonPath("$.seasonality[0].months[2]").isEqualTo(70.0)
    }

    @Test
    fun `should not count a movement that was not paid`() {

        insertClassification(SUPERMARKET_ID, "Supermarket", "EXPENSE")
        insertPeriod(9201L, "10/2026", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31))
        paidMovement(9201L, "EXPENSE", "30.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 10, 20))
        openMovement(9201L, "80.00", SUPERMARKET_ID, HOME_ID, LocalDate.of(2026, 11, 10))

        composition("2026")
            .expectBody()
            .jsonPath("$.seasonality.length()").isEqualTo(1)
            .jsonPath("$.seasonality[0].name").isEqualTo("Financial test gym")
            .jsonPath("$.seasonality[0].months[9]").isEqualTo(30.0)
            .jsonPath("$.seasonality[0].months[10]").isEqualTo(null)
    }

    @Test
    fun `should give zero in a month with lines of another classification and null in a month with none`() {

        insertClassification(SUPERMARKET_ID, "Supermarket", "EXPENSE")
        insertPeriod(9201L, "10/2026", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 11, 30))
        paidMovement(9201L, "EXPENSE", "30.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 10, 20))
        paidMovement(9201L, "EXPENSE", "80.00", SUPERMARKET_ID, HOME_ID, LocalDate.of(2026, 11, 10))

        composition("2026")
            .expectBody()
            .jsonPath("$.seasonality.length()").isEqualTo(2)
            .jsonPath("$.seasonality[0].name").isEqualTo("Supermarket")
            .jsonPath("$.seasonality[0].months[9]").isEqualTo(0)
            .jsonPath("$.seasonality[0].months[10]").isEqualTo(80.0)
            .jsonPath("$.seasonality[1].name").isEqualTo("Financial test gym")
            .jsonPath("$.seasonality[1].months[9]").isEqualTo(30.0)
            .jsonPath("$.seasonality[1].months[10]").isEqualTo(0)
            .jsonPath("$.seasonality[1].months[0]").isEqualTo(null)
    }

    @Test
    fun `should average the month over the years that have a line in it`() {

        insertPeriod(9201L, "10/2025", LocalDate.of(2025, 10, 1), LocalDate.of(2025, 10, 31))
        insertPeriod(9202L, "10/2026", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31))
        insertPeriod(9203L, "11/2026", LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30))
        paidMovement(9201L, "EXPENSE", "30.00", GYM_ID, HEALTH_ID, LocalDate.of(2025, 10, 10))
        paidMovement(9202L, "EXPENSE", "51.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 10, 10))
        paidMovement(9203L, "EXPENSE", "25.00", GYM_ID, HEALTH_ID, LocalDate.of(2026, 11, 10))

        composition("all")
            .expectBody()
            .jsonPath("$.seasonality[0].months[9]").isEqualTo(40.5)
            .jsonPath("$.seasonality[0].months[10]").isEqualTo(25.0)
            .jsonPath("$.seasonality[0].months[8]").isEqualTo(null)
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

        paidMovement(JULY_ID, "EXPENSE", "100.00", GYM_ID, HEALTH_ID, LocalDate.of(2024, 7, 10))
        paidMovement(JULY_ID, "EXPENSE", "40.00", GYM_ID, CHILD_ID, LocalDate.of(2024, 7, 11))
        paidMovement(JULY_ID, "INCOME", "5000.00", SALARY_ID, HEALTH_ID, LocalDate.of(2024, 7, 5))
        paidMovement(AUGUST_ID, "EXPENSE", "60.00", SUPERMARKET_ID, HOME_ID, LocalDate.of(2024, 8, 10))
        paidMovement(AUGUST_ID, "INCOME", "200.00", FREELANCE_ID, HOME_ID, LocalDate.of(2024, 8, 5))
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

    private fun insertInvoice(id: Long, cardId: Long, periodId: Long, status: String) {
        dsl.execute(
            """
            INSERT INTO financial.invoices (id, external_id, version, created_on, status, id_card, id_financial_period)
            VALUES (?, gen_random_uuid(), 0, now(), ?, ?, ?)
            """.trimIndent(),
            id, status, cardId, periodId
        )
    }

    private fun insertCardPurchase(
        id: Long,
        invoiceId: Long,
        value: String,
        classificationId: Long,
        costCenterId: Long,
        purchasedOn: LocalDate
    ) {
        dsl.execute(
            """
            INSERT INTO financial.card_purchases (id, external_id, version, created_on, name, purchased_on, value, id_invoice, id_classification, id_cost_center)
            VALUES (?, gen_random_uuid(), 0, now(), 'Card purchase', ?, ?::numeric, ?, ?, ?)
            """.trimIndent(),
            id, purchasedOn, value, invoiceId, classificationId, costCenterId
        )
    }

    private fun openMovement(periodId: Long, value: String, classificationId: Long, costCenterId: Long, dueDate: LocalDate) {
        dsl.execute(
            """
            INSERT INTO financial.movements (external_id, version, created_on, name, type, value, due_date, status, id_financial_period, id_classification, id_cost_center)
            VALUES (gen_random_uuid(), 0, now(), 'Open movement', 'EXPENSE', ?::numeric, ?, 'OPEN', ?, ?, ?)
            """.trimIndent(),
            value, dueDate, periodId, classificationId, costCenterId
        )
    }

    private fun paidMovement(
        periodId: Long,
        type: String,
        value: String,
        classificationId: Long,
        costCenterId: Long,
        paidOn: LocalDate
    ) {
        dsl.execute(
            """
            WITH inserted AS (
                INSERT INTO financial.movements (external_id, version, created_on, name, type, value, due_date, status, id_financial_period, id_classification, id_cost_center)
                VALUES (gen_random_uuid(), 0, now(), 'Paid movement', ?, ?::numeric, ?, 'PAID', ?, ?, ?)
                RETURNING id
            )
            INSERT INTO financial.payments (external_id, version, created_on, method, paid_on, value, discount, value_paid, id_movement, id_wallet)
            SELECT gen_random_uuid(), 0, now(), 'WALLET', ?, ?::numeric, 0, ?::numeric, id, 9101 FROM inserted
            """.trimIndent(),
            type, value, paidOn, periodId, classificationId, costCenterId, paidOn, value, value
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
