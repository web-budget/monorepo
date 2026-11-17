package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ACTIVE_RECURRING_MOVEMENT_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ENDED_RECURRING_MOVEMENT_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.EXPENSE_CLASSIFICATION_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.HEALTH_COST_CENTER_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.HOME_COST_CENTER_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.INCOME_CLASSIFICATION_ID
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
    "/sql/financial/create-recurring-movements.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class RecurringMovementControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var recurringMovementRepository: RecurringMovementRepository

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
        restTestClient.get().uri("$ENDPOINT_URL/$ACTIVE_RECURRING_MOVEMENT_ID").exchange().expectStatus().isForbidden
        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(createPayload())
            .exchange()
            .expectStatus().isForbidden
        restTestClient.put()
            .uri("$ENDPOINT_URL/$ACTIVE_RECURRING_MOVEMENT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updatePayload())
            .exchange()
            .expectStatus().isForbidden
        restTestClient.delete().uri("$ENDPOINT_URL/$ACTIVE_RECURRING_MOVEMENT_ID").exchange().expectStatus().isForbidden

        assertThat(recurringMovementRepository.findByExternalId(ACTIVE_RECURRING_MOVEMENT_ID)).isNotNull
    }

    @Test
    fun `should allow the financial role alone`() {

        authenticateWithRoles("FINANCIAL")

        restTestClient.get().uri(ENDPOINT_URL).exchange().expectStatus().isOk
    }

    @Test
    fun `should list the movements page ordered by the requested property`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=name,desc&size=1&page=0")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .json(
                """
                {
                  "content": [
                    {
                      "id": "$ENDED_RECURRING_MOVEMENT_ID",
                      "name": "Pilates",
                      "value": 400.00,
                      "state": "ENDED",
                      "autoLaunch": false,
                      "indeterminate": false,
                      "totalQuotes": 12,
                      "currentQuote": 12
                    }
                  ],
                  "page": {"size": 1, "number": 0, "totalElements": 2, "totalPages": 2}
                }
                """.trimIndent(),
                JsonCompareMode.STRICT
            )
    }

    @Test
    fun `should order the movements by value ascending`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=value,asc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Gym")
            .jsonPath("$.content[1].name").isEqualTo("Pilates")
    }

    @Test
    fun `should filter by part of the name ignoring the case`() {
        assertThatFilterMatches("filter=PILA", "Pilates")
    }

    @Test
    fun `should filter by the value written with a comma or a dot`() {
        assertThatFilterMatches("filter=400,00", "Pilates")
        assertThatFilterMatches("filter=320.0", "Gym")
    }

    @Test
    fun `should filter by the state`() {
        assertThatFilterMatches("states=ENDED", "Pilates")
        assertThatFilterMatches("states=ACTIVE&states=ENDED", "Gym", "Pilates")
    }

    @Test
    fun `should filter by the classification`() {
        assertThatFilterMatches("classification=$INCOME_CLASSIFICATION_ID", "Pilates")
    }

    @Test
    fun `should filter by the cost center`() {
        assertThatFilterMatches("costCenter=$HEALTH_COST_CENTER_ID", "Gym")
    }

    @Test
    fun `should combine the filters`() {
        assertThatFilterMatches("filter=gym&states=ACTIVE&classification=$EXPENSE_CLASSIFICATION_ID", "Gym")
        assertThatFilterMatches("filter=gym&states=ENDED")
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
            .uri("$ENDPOINT_URL/$ACTIVE_RECURRING_MOVEMENT_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .json(
                """
                {
                  "id": "$ACTIVE_RECURRING_MOVEMENT_ID",
                  "name": "Gym",
                  "value": 320.00,
                  "startingAt": "2024-01-02",
                  "state": "ACTIVE",
                  "autoLaunch": true,
                  "indeterminate": true,
                  "description": "Gym fees",
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
                  }
                }
                """.trimIndent(),
                JsonCompareMode.STRICT
            )
    }

    @Test
    fun `should show the quotes of a movement`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$ENDED_RECURRING_MOVEMENT_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalQuotes").isEqualTo(12)
            .jsonPath("$.startingQuote").isEqualTo(1)
            .jsonPath("$.currentQuote").isEqualTo(12)
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
                assertThat(location)
                    .matches("http://localhost:[0-9]+/private/v1/financial/recurring-movements/[0-9a-f-]{36}")
            }

        val created = recurringMovementRepository.findAll(
            filter = "Created", states = null, classification = null, costCenter = null, pageable = PageRequest.of(0, 10)
        ).content.single()

        assertThat(created.state).isEqualTo(RecurringMovement.State.ACTIVE)
        assertThat(created.value).isEqualByComparingTo("45.30")
        assertThat(created.autoLaunch).isTrue()
        assertThat(created.indeterminate).isFalse()
        assertThat(created.totalQuotes).isEqualTo(6)
        assertThat(created.startingQuote).isEqualTo(1)
        assertThat(created.currentQuote).isEqualTo(2)
    }

    @Test
    fun `should create an indeterminate movement when the flag is omitted`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {
                  "name": "Omitted",
                  "value": 10,
                  "startingAt": "2024-02-01",
                  "autoLaunch": false,
                  "classification": "$EXPENSE_CLASSIFICATION_ID",
                  "costCenter": "$HEALTH_COST_CENTER_ID"
                }
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isCreated

        val created = recurringMovementRepository.findAll(
            filter = "Omitted", states = null, classification = null, costCenter = null, pageable = PageRequest.of(0, 10)
        ).content.single()

        assertThat(created.indeterminate).isFalse()
        assertThat(created.autoLaunch).isFalse()
        assertThat(created.totalQuotes).isNull()
    }

    @Test
    fun `should answer unprocessable content when required fields are missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "", "value": null, "startingAt": null}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .json(
                """
                {
                  "error": "field-validation-failed",
                  "parameters": {
                    "name": "is-null-or-blank",
                    "value": "is-null",
                    "startingAt": "is-null",
                    "autoLaunch": "is-null",
                    "classification": "is-null",
                    "costCenter": "is-null"
                  }
                }
                """.trimIndent(),
                JsonCompareMode.LENIENT
            )
    }

    @Test
    fun `should answer not found when a referenced record does not exist`() {

        val unknownId = UUID.randomUUID()

        listOf(createPayload(classification = unknownId), createPayload(costCenter = unknownId)).forEach { payload ->
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
    fun `should update a movement and answer the list view`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$ACTIVE_RECURRING_MOVEMENT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updatePayload())
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(ACTIVE_RECURRING_MOVEMENT_ID.toString())
            .jsonPath("$.name").isEqualTo("Updated")
            .jsonPath("$.value").isEqualTo(320.0)
            .jsonPath("$.state").isEqualTo("ACTIVE")
            .jsonPath("$.autoLaunch").isEqualTo(false)

        val updated = recurringMovementRepository.findByExternalId(ACTIVE_RECURRING_MOVEMENT_ID)!!

        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.startingAt.toString()).isEqualTo("2025-03-01")
        assertThat(updated.classification.externalId).isEqualTo(INCOME_CLASSIFICATION_ID)
        assertThat(updated.costCenter.externalId).isEqualTo(HOME_COST_CENTER_ID)
        assertThat(updated.description).isEqualTo("Updated description")
        assertThat(updated.indeterminate).isTrue()
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
            .uri("$ENDPOINT_URL/$ACTIVE_RECURRING_MOVEMENT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("{}")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
    }

    @Test
    fun `should answer bad request when updating an ended movement`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$ENDED_RECURRING_MOVEMENT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updatePayload())
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("recurring-movement.errors.invalid-state")

        assertThat(recurringMovementRepository.findByExternalId(ENDED_RECURRING_MOVEMENT_ID)!!.name)
            .isEqualTo("Pilates")
    }

    @Test
    fun `should delete a movement`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$ENDED_RECURRING_MOVEMENT_ID")
            .exchange()
            .expectStatus().isOk

        assertThat(recurringMovementRepository.findByExternalId(ENDED_RECURRING_MOVEMENT_ID)).isNull()
    }

    @Test
    fun `should answer not found when deleting an unknown movement`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
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
        classification: UUID = EXPENSE_CLASSIFICATION_ID,
        costCenter: UUID = HEALTH_COST_CENTER_ID
    ) = """
        {
          "name": "Created",
          "value": 45.30,
          "startingAt": "2024-02-01",
          "autoLaunch": true,
          "indeterminate": false,
          "totalQuotes": 6,
          "startingQuote": 1,
          "currentQuote": 2,
          "classification": "$classification",
          "costCenter": "$costCenter",
          "description": "Created description"
        }
    """.trimIndent()

    private fun updatePayload() = """
        {
          "name": "Updated",
          "startingAt": "2025-03-01",
          "autoLaunch": false,
          "classification": "$INCOME_CLASSIFICATION_ID",
          "costCenter": "$HOME_COST_CENTER_ID",
          "description": "Updated description"
        }
    """.trimIndent()

    companion object {
        private const val ENDPOINT_URL = "/private/v1/financial/recurring-movements"
    }
}
