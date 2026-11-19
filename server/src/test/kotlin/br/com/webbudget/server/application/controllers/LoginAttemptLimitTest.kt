package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.infrastructure.config.security.AttemptKeys
import br.com.webbudget.server.infrastructure.config.security.IpAttemptLimiter
import br.com.webbudget.server.infrastructure.config.security.LoginAttemptLimiter
import br.com.webbudget.server.infrastructure.config.security.SecurityProperties
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec

class LoginAttemptLimitTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var securityProperties: SecurityProperties

    @Autowired
    private lateinit var ipAttemptLimiter: IpAttemptLimiter

    @Autowired
    private lateinit var loginAttemptLimiter: LoginAttemptLimiter

    @BeforeEach
    fun beAnonymous() {
        authenticateAnonymously()
    }

    @Test
    fun `should refuse an e-mail and address that reached the limit even with the right password`() {

        val address = "203.0.113.10"

        seedPairFailures(ADMIN_EMAIL, address, securityProperties.login.maxAttempts)

        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, address)
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_login_attempts")
    }

    @Test
    fun `should refuse the same way an e-mail that does not exist`() {

        val address = "203.0.113.11"

        seedPairFailures("ghost@webbudget.com.br", address, securityProperties.login.maxAttempts)

        postLogin("ghost@webbudget.com.br", "any-password", address)
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_login_attempts")
    }

    @Test
    fun `should not lock the same e-mail for another address`() {

        seedPairFailures(ADMIN_EMAIL, "203.0.113.12", securityProperties.login.maxAttempts)

        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, "203.0.113.13").expectStatus().isOk
    }

    @Test
    fun `should treat the e-mail case and spaces as the same key`() {

        val address = "203.0.113.14"

        seedPairFailures("  ADMIN@webbudget.com.br ", address, securityProperties.login.maxAttempts)

        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, address).expectStatus().isEqualTo(429)
    }

    @Test
    fun `should count the wrong passwords that really arrive`() {

        val address = "203.0.113.15"

        seedPairFailures(ADMIN_EMAIL, address, securityProperties.login.maxAttempts - 1)

        postLogin(ADMIN_EMAIL, "wrong-password", address)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")

        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, address)
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_login_attempts")
    }

    @Test
    fun `should count the failures of unknown e-mails against the address`() {

        val address = "203.0.113.16"

        repeat(securityProperties.ipLockout.maxAttempts - 1) { ipAttemptLimiter.recordFailure(address) }

        postLogin("ghost@webbudget.com.br", "any-password", address).expectStatus().isUnauthorized

        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, address)
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_login_attempts")
    }

    @Test
    fun `should refuse every e-mail from an address that reached its limit`() {

        val address = "203.0.113.17"

        repeat(securityProperties.ipLockout.maxAttempts) { ipAttemptLimiter.recordFailure(address) }

        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, address).expectStatus().isEqualTo(429)
        postLogin("ghost@webbudget.com.br", "any-password", address).expectStatus().isEqualTo(429)
    }

    @Test
    fun `should forget the failures of the pair after a good login`() {

        val address = "203.0.113.18"

        seedPairFailures(ADMIN_EMAIL, address, securityProperties.login.maxAttempts - 1)

        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, address).expectStatus().isOk
        postLogin(ADMIN_EMAIL, "wrong-password", address).expectStatus().isUnauthorized
        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, address).expectStatus().isOk
    }

    @Test
    fun `should not reset the limit of the address after a good login`() {

        val address = "203.0.113.19"

        repeat(securityProperties.ipLockout.maxAttempts - 1) { ipAttemptLimiter.recordFailure(address) }

        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, address).expectStatus().isOk
        postLogin(ADMIN_EMAIL, "wrong-password", address).expectStatus().isUnauthorized

        postLogin(ADMIN_EMAIL, ADMIN_PASSWORD, address).expectStatus().isEqualTo(429)
    }

    @Test
    fun `should refuse an e-mail longer than the form allows`() {

        postLogin("a".repeat(64) + "@" + ("b".repeat(63) + ".").repeat(3) + "com", "any-password", "203.0.113.30")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.email").isEqualTo("has-max-chars-of-254")
    }

    @Test
    fun `should answer an unauthorized for a password longer than the hash accepts`() {

        postLogin(ADMIN_EMAIL, "p".repeat(128), "203.0.113.31").expectStatus().isUnauthorized
    }

    private fun seedPairFailures(email: String, address: String, count: Int) {
        repeat(count) { loginAttemptLimiter.recordFailure(AttemptKeys.of(email, address)) }
    }

    private fun postLogin(email: String, password: String, address: String): ResponseSpec = restTestClient.post()
        .uri("/private/v1/auth/login")
        .header("X-Forwarded-For", address)
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"email": "$email", "password": "$password"}""")
        .exchange()

    companion object {
        private const val ADMIN_EMAIL = User.ADMIN_USERNAME
    }
}
