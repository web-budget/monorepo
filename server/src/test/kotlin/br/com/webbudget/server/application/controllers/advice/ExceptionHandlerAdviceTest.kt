package br.com.webbudget.server.application.controllers.advice

import br.com.webbudget.server.BaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType

class ExceptionHandlerAdviceTest : BaseIntegrationTest() {

    @Test
    fun `should answer a domain exception as problem detail with the error and parameters`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/domain")
            .exchange()
            .expectStatus().isBadRequest
            .expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
            .expectBody()
            .jsonPath("$.status").isEqualTo(400)
            .jsonPath("$.detail").isEqualTo("Domain rule broken")
            .jsonPath("$.error").isEqualTo("some-rule")
            .jsonPath("$.parameters.field").isEqualTo("value")
    }

    @Test
    fun `should answer a conflict with the conflicting properties`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/conflict")
            .exchange()
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("conflicting-properties")
            .jsonPath("$.parameters.field").isEqualTo("value")
    }

    @Test
    fun `should answer an application exception with its own status`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/application")
            .exchange()
            .expectStatus().isEqualTo(410)
            .expectBody()
            .jsonPath("$.error").isEqualTo("gone-for-good")
            .jsonPath("$.detail").isEqualTo("Gone for good")
            .jsonPath("$.parameters").doesNotExist()
    }

    @Test
    fun `should hide the details of an illegal argument`() {

        val body = restTestClient.get()
            .uri("$ENDPOINT_URL/illegal-argument")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("bad-request")
            .returnResult()
            .responseBodyContent!!
            .decodeToString()

        assertThat(body).doesNotContain("secret")
    }

    @Test
    fun `should hide the details of a data integrity violation`() {

        val body = restTestClient.get()
            .uri("$ENDPOINT_URL/data-integrity")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("data-integrity-violation")
            .returnResult()
            .responseBodyContent!!
            .decodeToString()

        assertThat(body).doesNotContain("secret")
    }

    @Test
    fun `should hide the details of a data access failure`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/data-access")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("bad-request")
    }

    @Test
    fun `should answer unexpected failures with a generic internal error`() {

        val body = restTestClient.get()
            .uri("$ENDPOINT_URL/unexpected")
            .exchange()
            .expectStatus().is5xxServerError
            .expectBody()
            .jsonPath("$.error").isEqualTo("internal-error")
            .returnResult()
            .responseBodyContent!!
            .decodeToString()

        assertThat(body).doesNotContain("secret")
    }

    @Test
    fun `should answer validation failures with the violated fields`() {

        restTestClient.post()
            .uri("$ENDPOINT_URL/validation")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "   "}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.error").isEqualTo("field-validation-failed")
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
    }

    @Test
    fun `should keep the default handling for malformed bodies`() {

        restTestClient.post()
            .uri("$ENDPOINT_URL/validation")
            .contentType(MediaType.APPLICATION_JSON)
            .body("{not json")
            .exchange()
            .expectStatus().isBadRequest
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/error-probe"
    }
}
