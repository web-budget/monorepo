package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.services.administration.UserService
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import br.com.webbudget.server.utilities.contents
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
    fun `should approve a pending account with its roles and tell the owner`() {

        val user = createUser(EMAIL, UserStatus.PENDING)

        approve(user, """["REGISTRATION", "FINANCIAL"]""").expectStatus().isOk

        val approved = userRepository.findByEmail(EMAIL)!!

        assertThat(approved.status).isEqualTo(UserStatus.APPROVED)
        assertThat(approved.roleNames()).containsExactlyInAnyOrder("REGISTRATION", "FINANCIAL")

        val message = greenMail.receivedMessages.single()

        assertThat(message.subject).isEqualTo("Sua conta no webBudget foi aprovada")
        assertThat(message.allRecipients.map { it.toString() }).containsExactly(EMAIL)
        assertThat(message.contents().plainText).contains("Áreas liberadas: Financeiro, Cadastros")
    }

    @Test
    fun `should give the approved account its roles on the next login`() {

        approve(createUser(EMAIL, UserStatus.PENDING), """["REGISTRATION", "FINANCIAL"]""").expectStatus().isOk

        restTestClient.get()
            .uri("/private/v1/auth/session")
            .header("Cookie", login(EMAIL, PASSWORD))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("APPROVED")
            .jsonPath("$.roles[0]").isEqualTo("FINANCIAL")
            .jsonPath("$.roles[1]").isEqualTo("REGISTRATION")
    }

    @Test
    fun `should replace the roles an account already had when approving it`() {

        val user = createUser(EMAIL, UserStatus.PENDING, "FINANCIAL", "DASHBOARDS")

        approve(user, """["REGISTRATION", "REGISTRATION"]""").expectStatus().isOk

        assertThat(userRepository.findByEmail(EMAIL)!!.roleNames()).containsExactly("REGISTRATION")
    }

    @Test
    fun `should refuse to approve without roles and leave the account pending`() {

        val user = createUser(EMAIL, UserStatus.PENDING)

        listOf(null, "{}", """{"roles": null}""", """{"roles": []}""").forEach { body ->
            approveWithBody(user, body)
                .expectStatus().isBadRequest
                .expectBody()
                .jsonPath("$.error").isEqualTo("field-validation-failed")
                .jsonPath("$.parameters.roles").isEqualTo("is-empty")
        }

        assertNothingChanged()
    }

    @Test
    fun `should refuse to approve with an unknown role and leave the account untouched`() {

        val user = createUser(EMAIL, UserStatus.PENDING, "DASHBOARDS")

        listOf("""["FINANCIAL", "NOT_A_ROLE"]""", """[null]""").forEach { roles ->
            approve(user, roles)
                .expectStatus().isBadRequest
                .expectBody()
                .jsonPath("$.error").isEqualTo("field-validation-failed")
                .jsonPath("$.parameters.roles").isEqualTo("unknown-role")
        }

        assertNothingChanged("DASHBOARDS")
    }

    @Test
    fun `should leave the account exactly as it was when a step of the approval fails`() {

        createUser(EMAIL, UserStatus.PENDING, "DASHBOARDS")

        val stale = userOf(EMAIL)

        dsl.update(USERS).set(USERS.VERSION, USERS.VERSION.plus(1)).where(USERS.EMAIL.eq(EMAIL)).execute()

        assertThatThrownBy { userService.approve(stale, listOf("FINANCIAL")) }
            .isInstanceOf(DomainException::class.java)
            .extracting { (it as DomainException).error }
            .isEqualTo("concurrent-update")

        assertNothingChanged("DASHBOARDS")
    }

    @Test
    fun `should not let the administrator approve the own account`() {

        signInAsSecondAdministrator()

        approve(userOf(ADMINISTRATOR_EMAIL), """["FINANCIAL"]""").expectSelfActionRefused()
    }

    @Test
    fun `should refuse to approve an account that is not pending`() {

        val approved = createUser(EMAIL, UserStatus.APPROVED)
        val blocked = createUser(OTHER_EMAIL, UserStatus.BLOCKED)

        approve(approved)
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-user-status-transition")
            .jsonPath("$.parameters.status").isEqualTo("APPROVED")
            .jsonPath("$.parameters.expected").isEqualTo("PENDING")

        approve(blocked).expectStatus().isEqualTo(409)

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
    fun `should tell the owner, in the language of the account, that it was blocked and then unblocked`() {

        createUser(EMAIL, UserStatus.APPROVED, "FINANCIAL")
        dsl.update(USERS).set(USERS.DEFAULT_LANGUAGE, "EN_US").where(USERS.EMAIL.eq(EMAIL)).execute()

        patch(userOf(EMAIL), "block").expectStatus().isOk

        val blockedMessage = greenMail.receivedMessages.single()

        assertThat(blockedMessage.subject).isEqualTo("Your webBudget account was blocked")
        assertThat(blockedMessage.allRecipients.map { it.toString() }).containsExactly(EMAIL)
        assertThat(blockedMessage.contents().html).contains("<html lang=\"en-US\"", "Account blocked")
        assertThat(blockedMessage.contents().plainText).contains("Your open sessions were ended")

        greenMail.purgeEmailFromAllMailboxes()

        patch(userOf(EMAIL), "unblock").expectStatus().isOk

        val unblockedMessage = greenMail.receivedMessages.single()

        assertThat(unblockedMessage.subject).isEqualTo("Your webBudget account was unblocked")
        assertThat(unblockedMessage.contents().plainText).contains("Sign in to webBudget: http://localhost:8086/login")
    }

    @Test
    fun `should tell the owner in Portuguese by default that it was blocked and unblocked`() {

        val user = createUser(EMAIL, UserStatus.APPROVED)

        patch(user, "block").expectStatus().isOk
        patch(userOf(EMAIL), "unblock").expectStatus().isOk

        assertThat(greenMail.receivedMessages.map { it.subject })
            .containsExactlyInAnyOrder("Sua conta no webBudget foi bloqueada", "Sua conta no webBudget foi desbloqueada")
    }

    @Test
    fun `should send nothing when the block or the unblock is refused`() {

        val pending = createUser(EMAIL, UserStatus.PENDING)
        val approved = createUser(OTHER_EMAIL, UserStatus.APPROVED)

        patch(pending, "block").expectStatus().isEqualTo(409)
        patch(pending, "unblock").expectStatus().isEqualTo(409)
        patch(approved, "unblock").expectStatus().isEqualTo(409)

        signInAsSecondAdministrator()

        patch(userOf(ADMINISTRATOR_EMAIL), "block").expectSelfActionRefused()

        assertThat(greenMail.receivedMessages).isEmpty()
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

        approve(user).expectStatus().isForbidden
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

    private fun approve(user: User, roles: String = """["FINANCIAL"]"""): ResponseSpec =
        approveWithBody(user, """{"roles": $roles}""")

    private fun approveWithBody(user: User, body: String?): ResponseSpec {

        val request = restTestClient.patch().uri("$ENDPOINT_URL/${user.externalId}/approve")

        return when (body) {
            null -> request.exchange()
            else -> request.contentType(MediaType.APPLICATION_JSON).body(body).exchange()
        }
    }

    private fun assertNothingChanged(vararg roles: String) {

        val user = userOf(EMAIL)

        assertThat(user.status).isEqualTo(UserStatus.PENDING)
        assertThat(user.roleNames()).containsExactlyInAnyOrder(*roles)
        assertThat(greenMail.receivedMessages).isEmpty()
    }

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
