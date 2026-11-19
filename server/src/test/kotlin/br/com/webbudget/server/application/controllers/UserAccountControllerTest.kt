package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.services.administration.AccountActivationService
import br.com.webbudget.server.domain.services.administration.RecoverPasswordService
import br.com.webbudget.server.infrastructure.repository.administration.AccountActivationAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.PasswordRecoverAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import java.util.UUID

@Sql("/sql/administration/clear-tables.sql", "/sql/administration/create-user.sql")
class UserAccountControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var recoverPasswordService: RecoverPasswordService

    @Autowired
    private lateinit var accountActivationService: AccountActivationService

    @Autowired
    private lateinit var passwordRecoverAttemptRepository: PasswordRecoverAttemptRepository

    @Autowired
    private lateinit var accountActivationAttemptRepository: AccountActivationAttemptRepository

    @Test
    fun `should accept forgot password without authentication and send the e-mail`() {

        authenticateAnonymously()

        patch("forgot-password", """{"email": "user@webbudget.com.br"}""")
            .expectStatus().isAccepted

        assertThat(greenMail.receivedMessages).hasSize(1)
        assertThat(greenMail.receivedMessages.first().subject).isEqualTo("Recuperação de senha")
        assertThat(passwordRecoverAttemptRepository.findByUserEmail("user@webbudget.com.br")).hasSize(1)
    }

    @Test
    fun `should accept forgot password for an unknown e-mail without sending anything`() {

        authenticateAnonymously()

        patch("forgot-password", """{"email": "unknown@webbudget.com.br"}""")
            .expectStatus().isAccepted

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should answer unprocessable content on forgot password with an empty e-mail`() {

        patch("forgot-password", """{"email": ""}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.error").isEqualTo("field-validation-failed")
            .jsonPath("$.parameters.email").isEqualTo("is-null-or-blank")
    }

    @Test
    fun `should answer the e-mail code on forgot password with an invalid e-mail`() {

        patch("forgot-password", """{"email": "not-an-email"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.email").isEqualTo("email-address-is-invalid")
    }

    @Test
    fun `should recover the password with a valid token`() {

        authenticateAnonymously()

        recoverPasswordService.registerRecoveryAttempt("user@webbudget.com.br")
        val attempt = passwordRecoverAttemptRepository.findByUserEmail("user@webbudget.com.br").first()
        val previousPassword = userRepository.findByEmail("user@webbudget.com.br")!!.password

        patch(
            "recover-password",
            """{"token": "${attempt.token}", "email": "user@webbudget.com.br", "password": "n3w-s3cr3t"}"""
        ).expectStatus().isOk

        assertThat(userRepository.findByEmail("user@webbudget.com.br")!!.password).isNotEqualTo(previousPassword)
        assertThat(passwordRecoverAttemptRepository.findByUserEmail("user@webbudget.com.br").first().used).isTrue()
    }

    @Test
    fun `should answer bad request when the recovery token is invalid`() {

        authenticateAnonymously()

        patch(
            "recover-password",
            """{"token": "${UUID.randomUUID()}", "email": "user@webbudget.com.br", "password": "n3w-s3cr3t"}"""
        )
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-token")
    }

    @Test
    fun `should answer unprocessable content on recover password with empty fields`() {

        patch("recover-password", """{"token": "", "email": "", "password": ""}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.error").isEqualTo("field-validation-failed")
            .jsonPath("$.parameters.token").isEqualTo("is-null")
            .jsonPath("$.parameters.email").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.password").isEqualTo("is-null-or-blank")
    }

    @Test
    fun `should answer the e-mail code on recover password with an invalid e-mail`() {

        patch(
            "recover-password",
            """{"token": "${UUID.randomUUID()}", "email": "not-an-email", "password": "n3w-s3cr3t"}"""
        )
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.email").isEqualTo("email-address-is-invalid")
    }

    @Test
    fun `should activate the account with a valid token`() {

        authenticateAnonymously()

        accountActivationService.requestActivation("other-user@webbudget.com.br")
        val attempt = accountActivationAttemptRepository.findByUserEmail("other-user@webbudget.com.br").first()

        patch("activate", """{"token": "${attempt.token}", "email": "other-user@webbudget.com.br"}""")
            .expectStatus().isOk

        assertThat(userRepository.findByEmail("other-user@webbudget.com.br")!!.active).isTrue()
    }

    @Test
    fun `should answer bad request when activating with an unknown token`() {

        authenticateAnonymously()

        patch("activate", """{"token": "${UUID.randomUUID()}", "email": "other-user@webbudget.com.br"}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-token")
    }

    @Test
    fun `should answer unprocessable content on activation with empty fields`() {

        patch("activate", """{"token": "", "email": ""}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.error").isEqualTo("field-validation-failed")
            .jsonPath("$.parameters.token").isEqualTo("is-null")
            .jsonPath("$.parameters.email").isEqualTo("is-null-or-blank")
    }

    @Test
    fun `should answer the e-mail code on activation with an invalid e-mail`() {

        patch("activate", """{"token": "${UUID.randomUUID()}", "email": "not-an-email"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.email").isEqualTo("email-address-is-invalid")
    }

    private fun patch(action: String, body: String) = restTestClient.patch()
        .uri("/private/v1/accounts/$action")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()
}
