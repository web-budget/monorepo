package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import br.com.webbudget.server.infrastructure.repository.financial.PeriodMovementRepository
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ACCOUNTED_PERIOD_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ACCOUNTED_PERIOD_MOVEMENT_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ACTIVE_PERIOD_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ENDED_PERIOD_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.EXPENSE_CLASSIFICATION_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.HEALTH_COST_CENTER_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.HOME_COST_CENTER_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.INCOME_CLASSIFICATION_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.OPEN_PERIOD_MOVEMENT_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.PAID_PERIOD_MOVEMENT_ID
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.json.JsonCompareMode
import java.util.UUID
import tools.jackson.databind.json.JsonMapper

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-period-movements.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class PeriodMovementControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var periodMovementRepository: PeriodMovementRepository

    @Test
    fun `should require authentication`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should require the financial role on every route`() {

        authenticateWithRoles("REGISTRATION", "ADMINISTRATION", "DASHBOARDS")

        restTestClient.get().uri(ENDPOINT_URL).exchange().expectStatus().isForbidden
        restTestClient.get().uri("$ENDPOINT_URL/$OPEN_PERIOD_MOVEMENT_ID").exchange().expectStatus().isForbidden
        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(createPayload())
            .exchange()
            .expectStatus().isForbidden
        restTestClient.put()
            .uri("$ENDPOINT_URL/$OPEN_PERIOD_MOVEMENT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updatePayload())
            .exchange()
            .expectStatus().isForbidden
        restTestClient.delete().uri("$ENDPOINT_URL/$OPEN_PERIOD_MOVEMENT_ID").exchange().expectStatus().isForbidden

        assertThat(periodMovementRepository.findByExternalId(OPEN_PERIOD_MOVEMENT_ID)).isNotNull
    }

    @Test
    fun `should allow the financial role alone`() {

        authenticateWithRoles("FINANCIAL")

        restTestClient.get().uri(ENDPOINT_URL).exchange().expectStatus().isOk
    }

    @Test
    fun `should list the movements page ordered by the requested property`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=name,asc&size=2&page=0")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .json(
                """
                {
                  "content": [
                    {
                      "id": "$PAID_PERIOD_MOVEMENT_ID",
                      "name": "Groceries",
                      "dueDate": "2024-12-10",
                      "value": 89.90,
                      "state": "PAID"
                    },
                    {
                      "id": "$OPEN_PERIOD_MOVEMENT_ID",
                      "name": "Gym",
                      "dueDate": "2024-12-30",
                      "value": 320.00,
                      "state": "OPEN",
                      "financialPeriod": {
                        "id": "$ACTIVE_PERIOD_ID",
                        "name": "Financial test 12/2024",
                        "startingAt": "2024-12-01",
                        "endingAt": "2024-12-31",
                        "status": "ACTIVE"
                      }
                    }
                  ],
                  "page": {"size": 2, "number": 0, "totalElements": 3, "totalPages": 2}
                }
                """.trimIndent(),
                JsonCompareMode.LENIENT
            )
    }

    @Test
    fun `should order the movements by value descending`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=value,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Salary")
            .jsonPath("$.content[1].name").isEqualTo("Gym")
            .jsonPath("$.content[2].name").isEqualTo("Groceries")
    }

    @Test
    fun `should ignore unknown sort properties`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=unknown,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Groceries")
            .jsonPath("$.page.totalElements").isEqualTo(3)
    }

    @Test
    fun `should filter by part of the name ignoring the case`() {
        assertThatFilterMatches("filter=GROC", "Groceries")
    }

    @Test
    fun `should filter by the value written with a comma or a dot`() {
        assertThatFilterMatches("filter=89,9", "Groceries")
        assertThatFilterMatches("filter=320.0", "Gym")
    }

    @Test
    fun `should filter by the state`() {
        assertThatFilterMatches("states=PAID", "Groceries")
        assertThatFilterMatches("states=OPEN&states=ACCOUNTED", "Gym", "Salary")
    }

    @Test
    fun `should filter by the classification`() {
        assertThatFilterMatches("classification=$INCOME_CLASSIFICATION_ID", "Salary")
    }

    @Test
    fun `should filter by the cost center`() {
        assertThatFilterMatches("costCenter=$HOME_COST_CENTER_ID", "Groceries", "Salary")
    }

    @Test
    fun `should filter by the financial periods`() {
        assertThatFilterMatches("financialPeriods=$ACTIVE_PERIOD_ID", "Groceries", "Gym")
        assertThatFilterMatches("financialPeriods=$ACTIVE_PERIOD_ID&financialPeriods=$ACCOUNTED_PERIOD_ID", "Groceries", "Gym", "Salary")
    }

    @Test
    fun `should ignore empty list filters`() {
        assertThatFilterMatches("states=&financialPeriods=", "Groceries", "Gym", "Salary")
    }

    @Test
    fun `should combine the filters`() {
        assertThatFilterMatches(
            "filter=gro&states=PAID&costCenter=$HOME_COST_CENTER_ID&classification=$EXPENSE_CLASSIFICATION_ID",
            "Groceries"
        )
        assertThatFilterMatches("filter=gro&states=OPEN")
    }

    @Test
    fun `should answer unprocessable content for an unknown state`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?states=UNKNOWN")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.error").isEqualTo("field-validation-failed")
    }

    @Test
    fun `should get a movement by id`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$OPEN_PERIOD_MOVEMENT_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .json(
                """
                {
                  "id": "$OPEN_PERIOD_MOVEMENT_ID",
                  "name": "Gym",
                  "dueDate": "2024-12-30",
                  "value": 320.00,
                  "state": "OPEN",
                  "description": "Gym fees of december",
                  "classification": {
                    "id": "$EXPENSE_CLASSIFICATION_ID",
                    "name": "Financial test gym",
                    "type": "EXPENSE",
                    "active": true,
                    "budget": 320.00
                  },
                  "costCenter": {
                    "id": "$HEALTH_COST_CENTER_ID",
                    "name": "Financial test health",
                    "fullName": "Financial test health",
                    "active": true,
                    "incomeBudget": 1000.00,
                    "expenseBudget": 800.00
                  },
                  "financialPeriod": {
                    "id": "$ACTIVE_PERIOD_ID",
                    "name": "Financial test 12/2024",
                    "startingAt": "2024-12-01",
                    "endingAt": "2024-12-31",
                    "status": "ACTIVE"
                  }
                }
                """.trimIndent(),
                JsonCompareMode.STRICT
            )
    }

    @Test
    fun `should show the quote number of a movement`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$PAID_PERIOD_MOVEMENT_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.quoteNumber").isEqualTo(2)
            .jsonPath("$.costCenter.incomeBudget").doesNotExist()
    }

    @Test
    fun `should answer not found for an unknown movement`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.error").isEqualTo("resource-not-found")
    }

    @Test
    fun `should create a movement and answer created with the location`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(createPayload())
            .exchange()
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location).matches("http://localhost:[0-9]+/private/v1/financial/period-movements/[0-9a-f-]{36}")
            }

        val created = periodMovementRepository.findAll(
            filter = "Created", states = null, classification = null, costCenter = null,
            financialPeriodIds = null, pageable = PageRequest.of(0, 10)
        ).content.single()

        assertThat(created.state).isEqualTo(PeriodMovement.State.OPEN)
        assertThat(created.value).isEqualByComparingTo("45.30")
        assertThat(created.financialPeriod.externalId).isEqualTo(ACTIVE_PERIOD_ID)
    }

    @Test
    fun `should answer unprocessable content when required fields are missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": " ", "dueDate": null, "value": null}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .json(
                """
                {
                  "error": "field-validation-failed",
                  "parameters": {
                    "name": "is-null-or-blank",
                    "dueDate": "is-null",
                    "value": "is-null",
                    "financialPeriod": "is-null",
                    "classification": "is-null",
                    "costCenter": "is-null"
                  }
                }
                """.trimIndent(),
                JsonCompareMode.LENIENT
            )
    }

    @Test
    fun `should answer unprocessable content when the name is too long`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(createPayload(name = "x".repeat(151)))
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("has-max-chars-of-150")
    }

    @Test
    fun `should answer not found when a referenced record does not exist`() {

        val unknownId = UUID.randomUUID()

        listOf(
            createPayload(classification = unknownId),
            createPayload(costCenter = unknownId),
            createPayload(financialPeriod = unknownId)
        ).forEach { payload ->
            restTestClient.post()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .exchange()
                .expectStatus().isNotFound
                .expectBody()
                .jsonPath("$.error").isEqualTo("resource-not-found")
        }
    }

    @Test
    fun `should answer bad request when the financial period is not open`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(createPayload(financialPeriod = ACCOUNTED_PERIOD_ID))
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-not-open")
    }

    @Test
    fun `should update a movement and answer the list view`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$OPEN_PERIOD_MOVEMENT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updatePayload(financialPeriod = ENDED_PERIOD_ID))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(OPEN_PERIOD_MOVEMENT_ID.toString())
            .jsonPath("$.name").isEqualTo("Updated")
            .jsonPath("$.value").isEqualTo(99.9)
            .jsonPath("$.state").isEqualTo("OPEN")
            .jsonPath("$.financialPeriod.id").isEqualTo(ENDED_PERIOD_ID.toString())

        val updated = periodMovementRepository.findByExternalId(OPEN_PERIOD_MOVEMENT_ID)!!

        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.classification.externalId).isEqualTo(INCOME_CLASSIFICATION_ID)
        assertThat(updated.costCenter.externalId).isEqualTo(HOME_COST_CENTER_ID)
        assertThat(updated.description).isEqualTo("Updated description")
    }

    @Test
    fun `should answer not found when updating an unknown movement`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updatePayload())
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should answer unprocessable content when updating with missing fields`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$OPEN_PERIOD_MOVEMENT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("{}")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
    }

    @Test
    fun `should answer not found when updating to an unknown reference`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$OPEN_PERIOD_MOVEMENT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updatePayload(financialPeriod = UUID.randomUUID()))
            .exchange()
            .expectStatus().isNotFound

        assertThat(periodMovementRepository.findByExternalId(OPEN_PERIOD_MOVEMENT_ID)!!.name).isEqualTo("Gym")
    }

    @Test
    fun `should answer bad request when updating an accounted movement`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$ACCOUNTED_PERIOD_MOVEMENT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updatePayload())
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("accounted-period-movement")
    }

    @Test
    fun `should delete a movement`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$OPEN_PERIOD_MOVEMENT_ID")
            .exchange()
            .expectStatus().isOk

        assertThat(periodMovementRepository.findByExternalId(OPEN_PERIOD_MOVEMENT_ID)).isNull()
    }

    @Test
    fun `should answer not found when deleting an unknown movement`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should answer bad request when deleting an accounted movement`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$ACCOUNTED_PERIOD_MOVEMENT_ID")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("accounted-period-movement")

        assertThat(periodMovementRepository.findByExternalId(ACCOUNTED_PERIOD_MOVEMENT_ID)).isNotNull
    }

    private fun assertThatFilterMatches(query: String, vararg names: String) {

        val body = restTestClient.get()
            .uri("$ENDPOINT_URL?sort=name,asc&$query")
            .exchange()
            .expectStatus().isOk
            .expectBody(String::class.java)
            .returnResult()
            .responseBody!!

        val found = JsonMapper().readTree(body).path("content").values().map { it.path("name").asString() }

        assertThat(found).containsExactly(*names)
    }

    private fun createPayload(
        name: String = "Created",
        financialPeriod: UUID = ACTIVE_PERIOD_ID,
        classification: UUID = EXPENSE_CLASSIFICATION_ID,
        costCenter: UUID = HEALTH_COST_CENTER_ID
    ) = """
        {
          "name": "$name",
          "dueDate": "2024-12-20",
          "value": 45.30,
          "financialPeriod": "$financialPeriod",
          "classification": "$classification",
          "costCenter": "$costCenter",
          "description": "Created description"
        }
    """.trimIndent()

    private fun updatePayload(financialPeriod: UUID = ACTIVE_PERIOD_ID) = """
        {
          "name": "Updated",
          "dueDate": "2025-01-10",
          "value": 99.90,
          "financialPeriod": "$financialPeriod",
          "classification": "$INCOME_CLASSIFICATION_ID",
          "costCenter": "$HOME_COST_CENTER_ID",
          "description": "Updated description"
        }
    """.trimIndent()

    companion object {
        private const val ENDPOINT_URL = "/private/v1/financial/period-movements"
    }
}
