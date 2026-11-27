package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.services.administration.InstanceSettingsService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql

@Sql("/sql/administration/clear-tables.sql")
class InstanceSettingsControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var instanceSettingsService: InstanceSettingsService

    @Test
    fun `should require authentication`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should require the administration role to read and to write`() {

        authenticateWithRoles("REGISTRATION", "FINANCIAL", "DASHBOARDS")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isForbidden

        restTestClient.put()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"reserveMonths": 12}""")
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should answer the default when nothing was saved`() {

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reserveMonths").isEqualTo(6)

        assertThat(instanceSettingsService.reserveMonths()).isEqualTo(6)
    }

    @Test
    fun `should save the reserve months and answer them afterwards`() {

        restTestClient.put()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"reserveMonths": 12}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reserveMonths").isEqualTo(12)

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reserveMonths").isEqualTo(12)

        restTestClient.put()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"reserveMonths": 24}""")
            .exchange()
            .expectStatus().isOk

        assertThat(instanceSettingsService.reserveMonths()).isEqualTo(24)
    }

    @Test
    fun `should accept the limits of the range`() {

        for (months in listOf(1, 24)) {
            restTestClient.put()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"reserveMonths": $months}""")
                .exchange()
                .expectStatus().isOk
                .expectBody()
                .jsonPath("$.reserveMonths").isEqualTo(months)
        }
    }

    @Test
    fun `should answer bad request when the reserve months are out of range`() {

        for (months in listOf(0, 25, -3)) {
            restTestClient.put()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"reserveMonths": $months}""")
                .exchange()
                .expectStatus().isBadRequest
                .expectBody()
                .jsonPath("$.error").isEqualTo("field-validation-failed")
                .jsonPath("$.parameters.reserveMonths").isEqualTo("reserve-months-out-of-range")
        }

        assertThat(instanceSettingsService.reserveMonths()).isEqualTo(6)
    }

    @Test
    fun `should answer unprocessable content when the reserve months are missing`() {

        restTestClient.put()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.reserveMonths").isEqualTo("is-null")
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/administration/settings"
    }
}
