package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.BaseIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.json.JsonCompareMode

class RoleControllerTest : BaseIntegrationTest() {

    @Test
    fun `should require authentication`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should require the administration role`() {

        authenticateWithRoles("REGISTRATION")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should get all roles ordered by name`() {

        authenticateWithRoles("ADMINISTRATION")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .json("""["ADMINISTRATION", "DASHBOARDS", "FINANCIAL", "REGISTRATION"]""", JsonCompareMode.STRICT)
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/administration/roles"
    }
}
