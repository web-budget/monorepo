package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.RestClientTestConfiguration.Companion.SKIP_CSRF_TOKEN_HEADER
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.env.Environment
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec

class AuthControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var environment: Environment

    @Test
    fun `should answer the session of the logged user with name, e-mail, status and roles`() {

        authenticateAnonymously()

        postLogin("admin@webbudget.com.br", ADMIN_PASSWORD)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Administrador")
            .jsonPath("$.email").isEqualTo("admin@webbudget.com.br")
            .jsonPath("$.status").isEqualTo("APPROVED")
            .jsonPath("$.roles.length()").isEqualTo(4)
            .jsonPath("$.roles[0]").isEqualTo("ADMINISTRATION")
            .jsonPath("$.roles[3]").isEqualTo("REGISTRATION")
            .jsonPath("$.password").doesNotExist()
    }

    @Test
    fun `should issue an http only session cookie with same site lax`() {

        authenticateAnonymously()

        postLogin("admin@webbudget.com.br", ADMIN_PASSWORD)
            .expectStatus().isOk
            .expectHeader().values("Set-Cookie") { cookies ->
                val sessionCookie = cookies.first { it.startsWith("JSESSIONID=") }
                assertThat(sessionCookie).containsIgnoringCase("HttpOnly")
                assertThat(sessionCookie).containsIgnoringCase("SameSite=Lax")
            }
    }

    @Test
    fun `should keep the session after the login`() {

        authenticateAs("admin@webbudget.com.br", ADMIN_PASSWORD)

        restTestClient.get()
            .uri(SESSION_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.email").isEqualTo("admin@webbudget.com.br")
    }

    @Test
    fun `should answer the live roles on the session and not the ones from the login`() {

        val user = createLoginUser("roles@webbudget.com.br", TEST_PASSWORD, "REGISTRATION", "FINANCIAL")
        val cookie = login(user.email, TEST_PASSWORD)

        restTestClient.put()
            .uri("/private/v1/administration/users/${user.externalId}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"active": true, "name": "Test user", "defaultLanguage": "PT_BR", "roles": ["DASHBOARDS"]}""")
            .exchange()
            .expectStatus().isOk

        restTestClient.get()
            .uri(SESSION_URL)
            .header("Cookie", cookie)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.roles.length()").isEqualTo(1)
            .jsonPath("$.roles[0]").isEqualTo("DASHBOARDS")
    }

    @Test
    fun `should refuse a wrong password`() {

        authenticateAnonymously()

        postLogin("admin@webbudget.com.br", "wrong-password")
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")
    }

    @Test
    fun `should refuse an unknown e-mail with the same answer of a wrong password`() {

        authenticateAnonymously()

        postLogin("unknown@webbudget.com.br", "wrong-password")
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")
    }

    @Test
    fun `should refuse the login of an inactive account that sent the right password`() {

        createLoginUser("inactive@webbudget.com.br", TEST_PASSWORD, "FINANCIAL", active = false)
        authenticateAnonymously()

        postLogin("inactive@webbudget.com.br", TEST_PASSWORD)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("account-disabled")
    }

    @Test
    fun `should refuse the login of a blocked account that sent the right password`() {

        createLoginUser("blocked@webbudget.com.br", TEST_PASSWORD, "FINANCIAL")
        changeStatus("blocked@webbudget.com.br", "BLOCKED")
        authenticateAnonymously()

        postLogin("blocked@webbudget.com.br", TEST_PASSWORD)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("account-disabled")
    }

    @Test
    fun `should let a pending account log in and see its status but not reach the business routes`() {

        createLoginUser("pending@webbudget.com.br", TEST_PASSWORD, "ADMINISTRATION")
        changeStatus("pending@webbudget.com.br", "PENDING")
        authenticateAnonymously()

        postLogin("pending@webbudget.com.br", TEST_PASSWORD)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PENDING")

        authenticateAs("pending@webbudget.com.br", TEST_PASSWORD)

        restTestClient.get()
            .uri(SESSION_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PENDING")

        restTestClient.get()
            .uri("/private/v1/administration/roles")
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("pending_approval")
    }

    @Test
    fun `should answer unprocessable content when the login form is incomplete`() {

        authenticateAnonymously()

        postLogin("", "")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.error").isEqualTo("field-validation-failed")
    }

    @Test
    fun `should answer unauthorized and prime the csrf cookie for an anonymous session read`() {

        sessionCookies.header = null

        restTestClient.get()
            .uri(SESSION_URL)
            .exchange()
            .expectStatus().isUnauthorized
            .expectHeader().values("Set-Cookie") { cookies ->
                assertThat(cookies).anyMatch { it.startsWith("XSRF-TOKEN=") && it.contains("SameSite=Lax") }
            }
            .expectBody()
            .jsonPath("$.error").isEqualTo("unauthenticated")
    }

    @Test
    fun `should refuse a state changing request without the csrf token`() {

        authenticateAnonymously()

        restTestClient.post()
            .uri(LOGIN_URL)
            .header(SKIP_CSRF_TOKEN_HEADER, "true")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"email": "admin@webbudget.com.br", "password": "$ADMIN_PASSWORD"}""")
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-csrf-token")
    }

    @Test
    fun `should refuse a state changing request with a wrong csrf token`() {

        authenticateAnonymously()

        restTestClient.post()
            .uri(LOGIN_URL)
            .header("X-XSRF-TOKEN", "wrong-token")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"email": "admin@webbudget.com.br", "password": "$ADMIN_PASSWORD"}""")
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-csrf-token")
    }

    @Test
    fun `should end the session on logout`() {

        restTestClient.post()
            .uri("/private/v1/auth/logout")
            .exchange()
            .expectStatus().isOk

        restTestClient.get()
            .uri(SESSION_URL)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should require a session to log out`() {

        authenticateAnonymously()

        restTestClient.post()
            .uri("/private/v1/auth/logout")
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should answer the language of the profile on the session`() {

        authenticateAs("admin@webbudget.com.br", ADMIN_PASSWORD)

        restTestClient.get()
            .uri(SESSION_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.language").isEqualTo("PT_BR")
    }

    @Test
    fun `should change the language of the own profile`() {

        authenticateWithRoles("REGISTRATION")

        patchLanguage("EN_US")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.language").isEqualTo("EN_US")

        restTestClient.get()
            .uri(SESSION_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.language").isEqualTo("EN_US")
    }

    @Test
    fun `should let a pending account change its language`() {

        createLoginUser("pending-language@webbudget.com.br", TEST_PASSWORD, "REGISTRATION")
        changeStatus("pending-language@webbudget.com.br", "PENDING")
        authenticateAs("pending-language@webbudget.com.br", TEST_PASSWORD)

        patchLanguage("EN_US")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PENDING")
            .jsonPath("$.language").isEqualTo("EN_US")
    }

    @Test
    fun `should refuse an unknown or missing language`() {

        patchLanguageBody("""{"language": "FR_FR"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.error").isEqualTo("field-validation-failed")

        patchLanguageBody("{}")
            .expectStatus().isEqualTo(422)
    }

    @Test
    fun `should require a session to change the language`() {

        authenticateAnonymously()

        patchLanguage("EN_US")
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should change the name of the own profile`() {

        authenticateWithRoles("REGISTRATION")

        patchProfile("  New Name  ")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("New Name")

        restTestClient.get()
            .uri(SESSION_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("New Name")
    }

    @Test
    fun `should let a pending account change its name`() {

        createLoginUser("pending-profile@webbudget.com.br", TEST_PASSWORD, "REGISTRATION")
        changeStatus("pending-profile@webbudget.com.br", "PENDING")
        authenticateAs("pending-profile@webbudget.com.br", TEST_PASSWORD)

        patchProfile("Pending Name")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PENDING")
            .jsonPath("$.name").isEqualTo("Pending Name")
    }

    @Test
    fun `should refuse a blank, missing, long or control character name`() {

        listOf(
            """{"name": ""}""" to "is-null-or-blank",
            """{}""" to "is-null-or-blank",
            """{"name": "${"a".repeat(101)}"}""" to "has-max-chars-of-100",
            "{\"name\": \"bad\\nname\"}" to "has-control-characters"
        ).forEach { (body, code) ->
            restTestClient.patch()
                .uri(PROFILE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus().isEqualTo(422)
                .expectBody()
                .jsonPath("$.error").isEqualTo("field-validation-failed")
                .jsonPath("$.parameters.name").isEqualTo(code)
        }
    }

    @Test
    fun `should require a session to change the name`() {

        authenticateAnonymously()

        patchProfile("Anonymous").expectStatus().isUnauthorized
    }

    @Test
    fun `should time the session out after thirty minutes`() {

        assertThat(environment.getRequiredProperty("server.servlet.session.timeout")).isEqualTo("30m")
    }

    private fun postLogin(email: String, password: String): ResponseSpec = restTestClient.post()
        .uri(LOGIN_URL)
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"email": "$email", "password": "$password"}""")
        .exchange()

    private fun patchProfile(name: String): ResponseSpec = restTestClient.patch()
        .uri(PROFILE_URL)
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"name": "$name"}""")
        .exchange()

    private fun patchLanguage(language: String): ResponseSpec = patchLanguageBody("""{"language": "$language"}""")

    private fun patchLanguageBody(body: String): ResponseSpec = restTestClient.patch()
        .uri("/private/v1/auth/language")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun changeStatus(email: String, status: String) {
        dsl.update(USERS).set(USERS.STATUS, status).where(USERS.EMAIL.eq(email)).execute()
    }

    companion object {
        private const val LOGIN_URL = "/private/v1/auth/login"
        private const val SESSION_URL = "/private/v1/auth/session"
        private const val PROFILE_URL = "/private/v1/auth/profile"
    }
}
