package br.com.webbudget.server.application.controllers.financial

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
    fun `should require the financial role`() {

        authenticateWithRoles("REGISTRATION")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should answer not found on the old registration route without redirecting`() {

        restTestClient.get()
            .uri("/private/v1/registration/financial-periods")
            .exchange()
            .expectStatus().isNotFound

        restTestClient.get()
            .uri("/private/v1/registration/financial-periods/$ACTIVE_ID")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should list the goals of each period`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=ALL&sort=name,asc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].revenuesGoal").doesNotExist()
            .jsonPath("$.content[1].revenuesGoal").isEqualTo(10000.0)
            .jsonPath("$.content[1].expensesGoal").isEqualTo(5000.0)
            .jsonPath("$.content[2].revenuesGoal").isEqualTo(9000.0)
            .jsonPath("$.content[2].expensesGoal").isEqualTo(4500.0)
    }

    @Test
    fun `should list only the closed periods when no status is requested`() {

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("07/2024")
            .jsonPath("$.content[0].status").isEqualTo("CLOSED")
            .jsonPath("$.content[0].expired").isEqualTo(false)
            .jsonPath("$.content[0].reopenable").isEqualTo(true)
    }

    @Test
    fun `should list only the closed periods when the closed status is requested`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=CLOSED")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].status").isEqualTo("CLOSED")
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
            .jsonPath("$.content[0].status").isEqualTo("OPEN")
            .jsonPath("$.content[0].expired").isEqualTo(true)
    }

    @Test
    fun `should answer unprocessable content for an unknown status`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=UNKNOWN")
            .exchange()
            .expectStatus().isEqualTo(422)
    }

    @Test
    fun `should list only the open periods with the full view`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/active?sort=startingAt,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(2)
            .jsonPath("$.content[0].id").isEqualTo(ACTIVE_ID)
            .jsonPath("$.content[0].expired").isEqualTo(true)
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
            .jsonPath("$.status").isEqualTo("OPEN")
            .jsonPath("$.reopenable").isEqualTo(false)
            .jsonPath("$.expired").isEqualTo(true)
            .jsonPath("$.expensesGoal").isEqualTo(4500.00)
    }

    @Test
    fun `should only let the last closed period be reopened`() {

        financialPeriodRepository.updateStatus(
            financialPeriodRepository.findByExternalId(UUID.fromString(ACTIVE_ID))!!.id!!,
            FinancialPeriod.Status.OPEN,
            FinancialPeriod.Status.CLOSED
        )

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=CLOSED&sort=name,asc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("07/2024")
            .jsonPath("$.content[0].reopenable").isEqualTo(false)
            .jsonPath("$.content[1].name").isEqualTo("08/2024")
            .jsonPath("$.content[1].reopenable").isEqualTo(true)

        restTestClient.get()
            .uri("$ENDPOINT_URL/$ACCOUNTED_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reopenable").isEqualTo(false)
    }

    @Test
    fun `should not mark a period as expired while its end date is not past`() {

        val upcoming = financialPeriodRepository.insert(
            FinancialPeriod("Upcoming", LocalDate.now().plusDays(1), LocalDate.now().plusDays(30))
        )

        restTestClient.get()
            .uri("$ENDPOINT_URL/${upcoming.externalId}")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("OPEN")
            .jsonPath("$.expired").isEqualTo(false)
    }

    @Test
    fun `should answer not found when the period does not exist`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should create the period as open`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "09/2024", "startingAt": "2024-09-01", "endingAt": "2024-09-30", "revenuesGoal": 10, "expensesGoal": 5}""")
            .exchange()
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location)
                    .matches("http://localhost:[0-9]+/private/v1/financial/financial-periods/[0-9a-f-]{36}")
            }

        val created = financialPeriodRepository.findAll("09/2024", FinancialPeriod.Status.entries, PageRequest.of(0, 1)).content.single()

        assertThat(created.status).isEqualTo(FinancialPeriod.Status.OPEN)
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
    fun `should answer bad request when the dates overlap a closed period`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Overlap closed", "startingAt": "2024-07-31", "endingAt": "2024-07-31"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("overlapping-start-end-dates")
    }

    @Test
    fun `should answer bad request when the new period encloses an existing one`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Enclosing", "startingAt": "2024-05-01", "endingAt": "2024-09-30"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("overlapping-start-end-dates")
    }

    @Test
    fun `should accept a period that touches no other period`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "05/2024", "startingAt": "2024-05-01", "endingAt": "2024-05-31"}""")
            .exchange()
            .expectStatus().isCreated

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "09/2024", "startingAt": "2024-09-01", "endingAt": "2024-09-30"}""")
            .exchange()
            .expectStatus().isCreated
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
            .jsonPath("$.status").isEqualTo("OPEN")

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
    fun `should answer bad request when another period overlaps the updated one`() {

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
        private const val ENDPOINT_URL = "/private/v1/financial/financial-periods"
        private const val ACTIVE_ID = "27881a12-5e61-43cd-a6d0-fdb32eaa75c0"
        private const val ACCOUNTED_ID = "df05156c-3fce-4f56-88ff-918d50200312"
    }
}
