package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.services.administration.RecoverPasswordService
import br.com.webbudget.server.domain.security.CurrentUserProvider
import br.com.webbudget.server.domain.exceptions.UnauthenticatedException
import br.com.webbudget.server.infrastructure.repository.administration.PasswordRecoverAttemptRepository
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec

class SessionRevocationTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var currentUserProvider: CurrentUserProvider

    @Autowired
    private lateinit var recoverPasswordService: RecoverPasswordService

    @Autowired
    private lateinit var passwordRecoverAttemptRepository: PasswordRecoverAttemptRepository

    @Test
    fun `should serve the roles endpoint to an administrator`() {

        createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")

        getRoles(login(EMAIL, TEST_PASSWORD))
            .expectStatus().isOk
    }

    @Test
    fun `should deny the next request after the administration role is removed`() {

        val user = createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION", "REGISTRATION")
        val cookie = login(EMAIL, TEST_PASSWORD)

        getRoles(cookie).expectStatus().isOk

        updateRoles(user, active = true, roles = """["REGISTRATION"]""")

        getRoles(cookie)
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("forbidden")
    }

    @Test
    fun `should end the session on the next request after the account is deactivated`() {

        val user = createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")
        val cookie = login(EMAIL, TEST_PASSWORD)

        getRoles(cookie).expectStatus().isOk

        updateRoles(user, active = false, roles = """["ADMINISTRATION"]""")

        getRoles(cookie)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("session-revoked")

        getRoles(cookie)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("unauthenticated")
    }

    @Test
    fun `should not let a deactivated account log in again`() {

        val user = createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")

        updateRoles(user, active = false, roles = """["ADMINISTRATION"]""")

        assertThatThrownBy { login(EMAIL, TEST_PASSWORD) }
            .hasMessageContaining("failed with status 401")
    }

    @Test
    fun `should deny the next request of a blocked account with the pending approval error`() {

        createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")
        val cookie = login(EMAIL, TEST_PASSWORD)

        dsl.update(USERS).set(USERS.STATUS, "BLOCKED").where(USERS.EMAIL.eq(EMAIL)).execute()

        getRoles(cookie)
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("pending_approval")

        restTestClient.get()
            .uri("/private/v1/auth/session")
            .header("Cookie", cookie)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("BLOCKED")
    }

    @Test
    fun `should end every other session when the administrator changes the password`() {

        val user = createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")
        val cookie = login(EMAIL, TEST_PASSWORD)

        getRoles(cookie).expectStatus().isOk

        changePassword(user, "brand-new-password").expectStatus().isOk

        getRoles(cookie)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("session-revoked")

        getRoles(login(EMAIL, "brand-new-password")).expectStatus().isOk
    }

    @Test
    fun `should keep the session of the administrator who changed the password of someone else`() {

        val user = createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")

        changePassword(user, "brand-new-password").expectStatus().isOk

        restTestClient.get()
            .uri("/private/v1/auth/session")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.email").isEqualTo(User.ADMIN_USERNAME)
    }

    @Test
    fun `should not let the administrator reset the password of the own account`() {

        val user = createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")
        val cookie = login(EMAIL, TEST_PASSWORD)

        changePassword(user, "brand-new-password", cookie)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("self-action-not-allowed")

        getRoles(cookie).expectStatus().isOk
    }

    @Test
    fun `should end the sessions of an account that recovered the password`() {

        createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")
        val cookie = login(EMAIL, TEST_PASSWORD)

        recoverPasswordService.registerRecoveryAttempt(EMAIL)
        val token = passwordRecoverAttemptRepository.findByUserEmail(EMAIL).first().token

        authenticateAnonymously()

        restTestClient.patch()
            .uri("/private/v1/accounts/recover-password")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"email": "$EMAIL", "token": "$token", "password": "recovered-password"}""")
            .exchange()
            .expectStatus().isOk

        getRoles(cookie)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("session-revoked")

        getRoles(login(EMAIL, "recovered-password")).expectStatus().isOk
    }

    @Test
    fun `should end the session when the account is deleted`() {

        val user = createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")
        val cookie = login(EMAIL, TEST_PASSWORD)

        restTestClient.delete()
            .uri("/private/v1/administration/users/${user.externalId}")
            .exchange()
            .expectStatus().isOk

        getRoles(cookie)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("session-revoked")
    }

    @Test
    fun `should not serve the owner of a recreated e-mail to the session of the deleted account`() {

        val user = createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")
        val cookie = login(EMAIL, TEST_PASSWORD)

        restTestClient.delete()
            .uri("/private/v1/administration/users/${user.externalId}")
            .exchange()
            .expectStatus().isOk

        createLoginUser(EMAIL, TEST_PASSWORD, "ADMINISTRATION")

        getRoles(cookie)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("session-revoked")
    }

    @Test
    fun `should refuse to resolve the current user without a session`() {

        SecurityContextHolder.clearContext()

        assertThatThrownBy { currentUserProvider.getCurrentUser() }
            .isInstanceOf(UnauthenticatedException::class.java)
    }

    private fun getRoles(cookie: String): ResponseSpec = restTestClient.get()
        .uri("/private/v1/administration/roles")
        .header("Cookie", cookie)
        .exchange()

    private fun updateRoles(user: User, active: Boolean, roles: String) {
        restTestClient.put()
            .uri("/private/v1/administration/users/${user.externalId}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"active": $active, "name": "Test user", "defaultLanguage": "PT_BR", "roles": $roles}""")
            .exchange()
            .expectStatus().isOk
    }

    private fun changePassword(user: User, password: String, cookie: String? = null): ResponseSpec {

        val request = restTestClient.patch()
            .uri("/private/v1/administration/users/${user.externalId}/update-password")
            .contentType(MediaType.APPLICATION_JSON)

        cookie?.let { request.header("Cookie", it) }

        return request
            .body("""{"temporary": false, "password": "$password"}""")
            .exchange()
    }

    companion object {
        private const val EMAIL = "revocation@webbudget.com.br"
    }
}
