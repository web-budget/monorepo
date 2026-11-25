package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.infrastructure.config.security.PasswordChangeAttemptLimiter
import br.com.webbudget.server.infrastructure.config.security.SecurityProperties
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import br.com.webbudget.server.utilities.contents
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec

class PasswordChangeTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var securityProperties: SecurityProperties

    @Autowired
    private lateinit var passwordChangeAttemptLimiter: PasswordChangeAttemptLimiter

    @Test
    fun `should change the own password, tell the user by e-mail and accept the new password on the login`() {

        createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)
        greenMail.purgeEmailFromAllMailboxes()

        patchPassword(PASSWORD, NEW_PASSWORD).expectStatus().isNoContent

        assertThat(passwordEncoder.matches(NEW_PASSWORD, userRepository.findByEmail(EMAIL)!!.password)).isTrue()
        assertThat(login(EMAIL, NEW_PASSWORD)).isNotBlank()

        val message = greenMail.receivedMessages.single()

        assertThat(message.allRecipients.map { it.toString() }).containsExactly(EMAIL)
        assertThat(message.subject).isEqualTo("Sua senha do webBudget foi alterada")
        assertThat(message.contents().html).contains("Por você, em Minha conta", "As outras sessões abertas foram encerradas.")
    }

    @Test
    fun `should refuse the old password on the login after the change`() {

        createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)

        patchPassword(PASSWORD, NEW_PASSWORD).expectStatus().isNoContent

        authenticateAnonymously()

        restTestClient.post()
            .uri("/private/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"email": "$EMAIL", "password": "$PASSWORD"}""")
            .exchange()
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")
    }

    @Test
    fun `should keep the current session and end the other sessions of the same user`() {

        createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)
        val otherSession = login(EMAIL, PASSWORD)

        patchPassword(PASSWORD, NEW_PASSWORD).expectStatus().isNoContent

        getSession().expectStatus().isOk
            .expectBody()
            .jsonPath("$.email").isEqualTo(EMAIL)
            .jsonPath("$.roles[0]").isEqualTo("REGISTRATION")

        restTestClient.get()
            .uri("/private/v1/registration/wallets")
            .exchange()
            .expectStatus().isOk

        restTestClient.get()
            .uri(SESSION_URL)
            .header("Cookie", otherSession)
            .exchange()
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("session-revoked")
    }

    @Test
    fun `should refuse a wrong current password with a code of its own and keep the password`() {

        createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)
        greenMail.purgeEmailFromAllMailboxes()

        patchPassword("wrong-password", NEW_PASSWORD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_current_password")

        assertThat(passwordEncoder.matches(PASSWORD, userRepository.findByEmail(EMAIL)!!.password)).isTrue()
        assertThat(greenMail.receivedMessages).isEmpty()
        getSession().expectStatus().isOk
    }

    @Test
    fun `should accept a new password equal to the current one`() {

        createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)

        patchPassword(PASSWORD, PASSWORD).expectStatus().isNoContent

        getSession().expectStatus().isOk
    }

    @Test
    fun `should validate the new password and require the current one`() {

        createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)

        listOf(
            """{"currentPassword": "$PASSWORD", "newPassword": "${"a".repeat(73)}"}""" to ("newPassword" to "has-max-bytes-of-72"),
            """{"currentPassword": "$PASSWORD", "newPassword": "${"ã".repeat(37)}"}""" to ("newPassword" to "has-max-bytes-of-72"),
            """{"currentPassword": "$PASSWORD", "newPassword": ""}""" to ("newPassword" to "is-null-or-blank"),
            """{"currentPassword": "$PASSWORD"}""" to ("newPassword" to "is-null-or-blank"),
            """{"newPassword": "$NEW_PASSWORD"}""" to ("currentPassword" to "is-null-or-blank"),
            """{"currentPassword": "", "newPassword": "$NEW_PASSWORD"}""" to ("currentPassword" to "is-null-or-blank")
        ).forEach { (body, violation) ->
            restTestClient.patch()
                .uri(PASSWORD_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus().isEqualTo(422)
                .expectBody()
                .jsonPath("$.error").isEqualTo("field-validation-failed")
                .jsonPath("$.parameters.${violation.first}").isEqualTo(violation.second)
        }

        assertThat(passwordEncoder.matches(PASSWORD, userRepository.findByEmail(EMAIL)!!.password)).isTrue()
    }

    @Test
    fun `should accept a new password of exactly seventy two bytes`() {

        createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)

        patchPassword(PASSWORD, "a".repeat(72)).expectStatus().isNoContent
    }

    @Test
    fun `should answer too many attempts after the configured wrong current passwords, even with the right one`() {

        val user = createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)

        repeat(securityProperties.passwordChange.maxAttempts) {
            passwordChangeAttemptLimiter.recordFailure(user.externalId.toString())
        }

        patchPassword(PASSWORD, NEW_PASSWORD)
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_password_change_attempts")

        assertThat(passwordEncoder.matches(PASSWORD, userRepository.findByEmail(EMAIL)!!.password)).isTrue()
        passwordChangeAttemptLimiter.recordSuccess(user.externalId.toString())
    }

    @Test
    fun `should clear the failures of the user after a right current password`() {

        val user = createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)

        repeat(securityProperties.passwordChange.maxAttempts - 1) {
            passwordChangeAttemptLimiter.recordFailure(user.externalId.toString())
        }

        patchPassword(PASSWORD, NEW_PASSWORD).expectStatus().isNoContent

        passwordChangeAttemptLimiter.checkNotLocked(user.externalId.toString())
    }

    @Test
    fun `should refuse the change in an account without a password`() {

        val user = createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)
        greenMail.purgeEmailFromAllMailboxes()
        makeGoogleOnly(user)

        patchPassword(PASSWORD, NEW_PASSWORD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("account_without_password")

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should let a pending account change its password`() {

        createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        dsl.update(USERS).set(USERS.STATUS, "PENDING").where(USERS.EMAIL.eq(EMAIL)).execute()
        authenticateAs(EMAIL, PASSWORD)

        patchPassword(PASSWORD, NEW_PASSWORD).expectStatus().isNoContent

        getSession().expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PENDING")
    }

    @Test
    fun `should require a session to change the password`() {

        authenticateAnonymously()

        patchPassword(PASSWORD, NEW_PASSWORD).expectStatus().isUnauthorized
    }

    @Test
    fun `should tell on the session that an account has a password and no google or totp`() {

        createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)

        getSession().expectStatus().isOk
            .expectBody()
            .jsonPath("$.hasPassword").isEqualTo(true)
            .jsonPath("$.googleLinked").isEqualTo(false)
            .jsonPath("$.totpEnabled").isEqualTo(false)
            .jsonPath("$.totpRequired").isEqualTo(false)
    }

    @Test
    fun `should tell on the session that an account has a password and google`() {

        val user = createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)
        dsl.update(USERS).set(USERS.GOOGLE_SUB, "sub-both").where(USERS.ID.eq(user.id)).execute()

        getSession().expectStatus().isOk
            .expectBody()
            .jsonPath("$.hasPassword").isEqualTo(true)
            .jsonPath("$.googleLinked").isEqualTo(true)
    }

    @Test
    fun `should tell on the session that an account only has google`() {

        val user = createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)
        makeGoogleOnly(user)

        getSession().expectStatus().isOk
            .expectBody()
            .jsonPath("$.hasPassword").isEqualTo(false)
            .jsonPath("$.googleLinked").isEqualTo(true)
    }

    @Test
    fun `should tell the totp of the user as on even while the installation does not ask for it`() {

        val user = createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        authenticateAs(EMAIL, PASSWORD)
        userRepository.updateTotpSecret(user.id!!, "JBSWY3DPEHPK3PXP")
        userRepository.enableTotp(user.id!!, "JBSWY3DPEHPK3PXP")

        getSession().expectStatus().isOk
            .expectBody()
            .jsonPath("$.totpEnabled").isEqualTo(true)
            .jsonPath("$.totpRequired").isEqualTo(false)
    }

    @Test
    fun `should carry the new fields on the language answer`() {

        authenticateAs(User.ADMIN_USERNAME, ADMIN_PASSWORD)

        restTestClient.patch()
            .uri("/private/v1/auth/language")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"language": "PT_BR"}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.hasPassword").isEqualTo(true)
            .jsonPath("$.googleLinked").isEqualTo(false)
            .jsonPath("$.totpEnabled").isEqualTo(false)
    }

    private fun makeGoogleOnly(user: User) {
        dsl.update(USERS)
            .set(USERS.PASSWORD, null as String?)
            .set(USERS.AUTH_PROVIDER, "GOOGLE")
            .set(USERS.GOOGLE_SUB, "sub-only")
            .where(USERS.ID.eq(user.id))
            .execute()
    }

    private fun getSession(): ResponseSpec = restTestClient.get().uri(SESSION_URL).exchange()

    private fun patchPassword(currentPassword: String, newPassword: String): ResponseSpec = restTestClient.patch()
        .uri(PASSWORD_URL)
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"currentPassword": "$currentPassword", "newPassword": "$newPassword"}""")
        .exchange()

    companion object {
        private const val EMAIL = "password-change@webbudget.com.br"
        private const val PASSWORD = "current-password"
        private const val NEW_PASSWORD = "brand-new-password"
        private const val PASSWORD_URL = "/private/v1/auth/password"
        private const val SESSION_URL = "/private/v1/auth/session"
    }
}
