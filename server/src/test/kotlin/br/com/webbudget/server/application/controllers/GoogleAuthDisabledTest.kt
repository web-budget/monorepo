package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType

class GoogleAuthDisabledTest : BaseIntegrationTest() {

    @Test
    fun `should tell the client that the google login is off`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri("$AUTH_URL/config")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.googleAuthEnabled").isEqualTo(false)
    }

    @Test
    fun `should not start the google flow`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri("/private/oauth2/authorization/google")
            .exchange()
            .expectStatus().isNotFound

        restTestClient.get()
            .uri("/private/login/oauth2/code/google?code=a&state=b")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should not link an account while the google login is off`() {

        authenticateAnonymously()

        restTestClient.post()
            .uri("$AUTH_URL/google/link")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"linkToken": "any-token", "password": "any-password"}""")
            .exchange()
            .expectStatus().isNotFound
    }

    companion object {
        private const val AUTH_URL = "/private/v1/auth"
    }
}
