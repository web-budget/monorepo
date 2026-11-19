package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.services.administration.UserService
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.util.UUID

class UserApprovalTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var userService: UserService

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `should approve a pending account and tell the owner`() {

        val user = createUser(EMAIL, UserStatus.PENDING)

        patch(user, "approve").expectStatus().isOk

        assertThat(userRepository.findByEmail(EMAIL)!!.status).isEqualTo(UserStatus.APPROVED)

        val message = greenMail.receivedMessages.single()

        assertThat(message.subject).isEqualTo("Sua conta foi aprovada")
        assertThat(message.allRecipients.map { it.toString() }).containsExactly(EMAIL)
    }

    @Test
    fun `should refuse to approve an account that is not pending`() {

        val approved = createUser(EMAIL, UserStatus.APPROVED)
        val blocked = createUser(OTHER_EMAIL, UserStatus.BLOCKED)

        patch(approved, "approve")
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-user-status-transition")
            .jsonPath("$.parameters.status").isEqualTo("APPROVED")
            .jsonPath("$.parameters.expected").isEqualTo("PENDING")

        patch(blocked, "approve").expectStatus().isEqualTo(409)

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should block an approved account, end its sessions and refuse its login`() {

        val user = createUser(EMAIL, UserStatus.APPROVED, "ADMINISTRATION")
        val cookie = login(EMAIL, PASSWORD)

        patch(user, "block").expectStatus().isOk

        assertThat(userRepository.findByEmail(EMAIL)!!.status).isEqualTo(UserStatus.BLOCKED)

        restTestClient.get()
            .uri("/private/v1/administration/roles")
            .header("Cookie", cookie)
            .exchange()
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("session-revoked")

        assertThatThrownBy { login(EMAIL, PASSWORD) }.hasMessageContaining("failed with status 401")
    }

    @Test
    fun `should refuse to block an account that is not approved`() {

        val pending = createUser(EMAIL, UserStatus.PENDING)
        val blocked = createUser(OTHER_EMAIL, UserStatus.BLOCKED)

        patch(pending, "block").expectStatus().isEqualTo(409)
        patch(blocked, "block").expectStatus().isEqualTo(409)
    }

    @Test
    fun `should unblock a blocked account and let it log in again`() {

        val user = createUser(EMAIL, UserStatus.APPROVED, "ADMINISTRATION")

        patch(user, "block").expectStatus().isOk
        patch(user, "unblock").expectStatus().isOk

        assertThat(userRepository.findByEmail(EMAIL)!!.status).isEqualTo(UserStatus.APPROVED)

        restTestClient.get()
            .uri("/private/v1/administration/roles")
            .header("Cookie", login(EMAIL, PASSWORD))
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `should refuse to unblock an account that is not blocked`() {

        val pending = createUser(EMAIL, UserStatus.PENDING)
        val approved = createUser(OTHER_EMAIL, UserStatus.APPROVED)

        patch(pending, "unblock").expectStatus().isEqualTo(409)
        patch(approved, "unblock").expectStatus().isEqualTo(409)
    }

    @Test
    fun `should answer not found for an unknown account`() {

        listOf("approve", "block", "unblock").forEach { action ->
            restTestClient.patch()
                .uri("$ENDPOINT_URL/${UUID.randomUUID()}/$action")
                .exchange()
                .expectStatus().isNotFound
        }
    }

    @Test
    fun `should require the administration role`() {

        val user = createUser(EMAIL, UserStatus.PENDING)

        authenticateWithRoles("FINANCIAL")

        patch(user, "approve").expectStatus().isForbidden
        patch(user, "block").expectStatus().isForbidden
        patch(user, "unblock").expectStatus().isForbidden
    }

    @Test
    fun `should not let the administrator block the own account`() {

        signInAsSecondAdministrator()

        patch(userOf(ADMINISTRATOR_EMAIL), "block").expectSelfActionRefused()
    }

    @Test
    fun `should not let the administrator reset the password of the own account`() {

        signInAsSecondAdministrator()

        restTestClient.patch()
            .uri("$ENDPOINT_URL/${userOf(ADMINISTRATOR_EMAIL).externalId}/update-password")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"temporary": false, "password": "another-password"}""")
            .exchange()
            .expectSelfActionRefused()
    }

    @Test
    fun `should not let the administrator delete the own account`() {

        signInAsSecondAdministrator()

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${userOf(ADMINISTRATOR_EMAIL).externalId}")
            .exchange()
            .expectSelfActionRefused()
    }

    @Test
    fun `should not let the administrator change the own roles or deactivate the own account`() {

        signInAsSecondAdministrator()

        val own = userOf(ADMINISTRATOR_EMAIL)

        update(own, active = true, roles = """["ADMINISTRATION", "FINANCIAL"]""").expectSelfActionRefused()
        update(own, active = true, roles = """["FINANCIAL"]""").expectSelfActionRefused()
        update(own, active = false, roles = """["ADMINISTRATION"]""").expectSelfActionRefused()

        assertThat(userOf(ADMINISTRATOR_EMAIL).roleNames()).containsExactly("ADMINISTRATION")
    }

    @Test
    fun `should let the administrator edit the name of the own account`() {

        signInAsSecondAdministrator()

        update(userOf(ADMINISTRATOR_EMAIL), active = true, roles = """["ADMINISTRATION"]""", name = "Renamed")
            .expectStatus().isOk

        assertThat(userOf(ADMINISTRATOR_EMAIL).name).isEqualTo("Renamed")
    }

    @Test
    fun `should still let the administrator manage another account`() {

        val other = createUser(EMAIL, UserStatus.APPROVED, "FINANCIAL")

        update(other, active = false, roles = """["REGISTRATION"]""").expectStatus().isOk

        restTestClient.patch()
            .uri("$ENDPOINT_URL/${other.externalId}/update-password")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"temporary": false, "password": "another-password"}""")
            .exchange()
            .expectStatus().isOk

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${other.externalId}")
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `should list the account status and filter by it`() {

        createUser(EMAIL, UserStatus.PENDING)
        createUser(OTHER_EMAIL, UserStatus.BLOCKED)

        restTestClient.get()
            .uri("$ENDPOINT_URL?userStatus=PENDING&status=ALL")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].email").isEqualTo(EMAIL)
            .jsonPath("$.content[0].status").isEqualTo("PENDING")

        restTestClient.get()
            .uri("$ENDPOINT_URL?userStatus=BLOCKED&status=ALL")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].email").isEqualTo(OTHER_EMAIL)
    }

    @Test
    fun `should create the account made by the administrator as approved`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "Made", "email": "$EMAIL", "password": "$PASSWORD", "defaultLanguage": "PT_BR", "roles": ["FINANCIAL"]}"""
            )
            .exchange()
            .expectStatus().isCreated

        val user = userRepository.findByEmail(EMAIL)!!

        assertThat(user.status).isEqualTo(UserStatus.APPROVED)

        userService.deleteAccount(user)
    }

    private fun createUser(email: String, status: UserStatus, vararg roles: String): User {

        createLoginUser(email, PASSWORD, *roles)

        dsl.update(USERS).set(USERS.STATUS, status.name).where(USERS.EMAIL.eq(email)).execute()

        return userOf(email)
    }

    private fun signInAsSecondAdministrator() {
        createUser(ADMINISTRATOR_EMAIL, UserStatus.APPROVED, "ADMINISTRATION")
        authenticateAs(ADMINISTRATOR_EMAIL, PASSWORD)
    }

    private fun userOf(email: String): User = userRepository.findByEmail(email)!!

    private fun patch(user: User, action: String): ResponseSpec = restTestClient.patch()
        .uri("$ENDPOINT_URL/${user.externalId}/$action")
        .exchange()

    private fun update(user: User, active: Boolean, roles: String, name: String = "Test user"): ResponseSpec =
        restTestClient.put()
            .uri("$ENDPOINT_URL/${user.externalId}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"active": $active, "name": "$name", "defaultLanguage": "PT_BR", "roles": $roles}""")
            .exchange()

    private fun ResponseSpec.expectSelfActionRefused() {
        expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("self-action-not-allowed")
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/administration/users"
        private const val EMAIL = "approval@webbudget.com.br"
        private const val OTHER_EMAIL = "approval-other@webbudget.com.br"
        private const val ADMINISTRATOR_EMAIL = "second-admin@webbudget.com.br"
        private const val PASSWORD = "approval-password"
    }
}
