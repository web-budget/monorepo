package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.infrastructure.repository.registration.FinancialPeriodRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import java.time.LocalDate
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-financial-periods.sql")
class FinancialPeriodControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var financialPeriodRepository: FinancialPeriodRepository

    @Test
    fun `should require authentication`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should require the registration role`() {

        authenticateWithRoles("FINANCIAL")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should list only the accounted periods when no status is requested`() {

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("07/2024")
            .jsonPath("$.content[0].status").isEqualTo("ACCOUNTED")
    }

    @Test
    fun `should list the open periods paged and sorted`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=OPEN&sort=startingAt,desc&page=0&size=1")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("08/2024")
            .jsonPath("$.content[0].startingAt").isEqualTo("2024-08-01")
            .jsonPath("$.content[0].endingAt").isEqualTo("2024-08-31")
            .jsonPath("$.page.totalElements").isEqualTo(2)
            .jsonPath("$.page.totalPages").isEqualTo(2)
    }

    @Test
    fun `should list all the periods and filter them by name`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=ALL")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=ALL&filter=06/")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].status").isEqualTo("ENDED")
    }

    @Test
    fun `should answer unprocessable content for an unknown status`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=UNKNOWN")
            .exchange()
            .expectStatus().isEqualTo(422)
    }

    @Test
    fun `should list only the active periods with the full view`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/active")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].id").isEqualTo(ACTIVE_ID)
            .jsonPath("$.content[0].expensesGoal").isEqualTo(4500.00)
            .jsonPath("$.content[0].revenuesGoal").isEqualTo(9000.00)
    }

    @Test
    fun `should find by id`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$ACTIVE_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(ACTIVE_ID)
            .jsonPath("$.name").isEqualTo("08/2024")
            .jsonPath("$.status").isEqualTo("ACTIVE")
            .jsonPath("$.expensesGoal").isEqualTo(4500.00)
    }

    @Test
    fun `should answer not found when the period does not exist`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should create the period as active`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "09/2024", "startingAt": "2024-09-01", "endingAt": "2024-09-30", "revenuesGoal": 10, "expensesGoal": 5}""")
            .exchange()
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location)
                    .matches("http://localhost:[0-9]+/private/v1/registration/financial-periods/[0-9a-f-]{36}")
            }

        val created = financialPeriodRepository.findAll("09/2024", FinancialPeriod.Status.entries, PageRequest.of(0, 1)).content.single()

        assertThat(created.status).isEqualTo(FinancialPeriod.Status.ACTIVE)
        assertThat(created.startingAt).isEqualTo(LocalDate.of(2024, 9, 1))
        assertThat(created.expensesGoal).isEqualByComparingTo("5")
    }

    @Test
    fun `should answer unprocessable content when the required fields are missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "", "startingAt": null, "endingAt": null}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.startingAt").isEqualTo("is-null")
            .jsonPath("$.parameters.endingAt").isEqualTo("is-null")
    }

    @Test
    fun `should answer bad request when the start is after the end`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "09/2024", "startingAt": "2024-09-30", "endingAt": "2024-09-01"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("start-date-after-end-date")
    }

    @Test
    fun `should answer bad request when the dates overlap an open period`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Overlap", "startingAt": "2024-08-15", "endingAt": "2024-09-15"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("overlapping-start-end-dates")
    }

    @Test
    fun `should answer conflict when the name is already taken ignoring case`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "08/2024", "startingAt": "2025-01-01", "endingAt": "2025-01-31"}""")
            .exchange()
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.parameters['financial-period.name']").isEqualTo("08/2024")
    }

    @Test
    fun `should update the name and the goals`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$ACTIVE_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Renamed", "revenuesGoal": 1, "expensesGoal": 2}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Renamed")
            .jsonPath("$.startingAt").isEqualTo("2024-08-01")
            .jsonPath("$.revenuesGoal").isEqualTo(1)
            .jsonPath("$.expensesGoal").isEqualTo(2)
            .jsonPath("$.status").isEqualTo("ACTIVE")

        val updated = financialPeriodRepository.findByExternalId(UUID.fromString(ACTIVE_ID))!!

        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.lastUpdate).isNotNull
    }

    @Test
    fun `should answer bad request when updating a period that is not open`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$ACCOUNTED_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Renamed"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-not-open")
    }

    @Test
    fun `should answer conflict when updating to the name of another period`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$ACTIVE_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "06/2024"}""")
            .exchange()
            .expectStatus().isEqualTo(409)
    }

    @Test
    fun `should answer bad request when another open period overlaps the updated one`() {

        financialPeriodRepository.insert(
            FinancialPeriod("Overlapping", LocalDate.of(2024, 7, 25), LocalDate.of(2024, 8, 5))
        )

        restTestClient.put()
            .uri("$ENDPOINT_URL/$ACTIVE_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "08/2024"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("overlapping-start-end-dates")
    }

    @Test
    fun `should answer not found when updating an unknown period`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Name"}""")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should delete an open period`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$ACTIVE_ID")
            .exchange()
            .expectStatus().isOk

        assertThat(financialPeriodRepository.findByExternalId(UUID.fromString(ACTIVE_ID))).isNull()
    }

    @Test
    fun `should answer bad request when deleting a period that is not open`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$ACCOUNTED_ID")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-not-open")
    }

    @Test
    fun `should answer not found when deleting an unknown period`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/registration/financial-periods"
        private const val ACTIVE_ID = "27881a12-5e61-43cd-a6d0-fdb32eaa75c0"
        private const val ACCOUNTED_ID = "df05156c-3fce-4f56-88ff-918d50200312"
    }
}
