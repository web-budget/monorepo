package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.infrastructure.repository.administration.PasswordRecoverAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import br.com.webbudget.server.utilities.contents
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import java.util.UUID

class SecurityNoticesTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var userService: UserService

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var recoverPasswordService: RecoverPasswordService

    @Autowired
    private lateinit var passwordRecoverAttemptRepository: PasswordRecoverAttemptRepository

    @Test
    fun `should warn the owner when the password is changed through the recovery`() {

        createLoginUser(EMAIL)

        recoverPasswordService.registerRecoveryAttempt(EMAIL)
        greenMail.purgeEmailFromAllMailboxes()

        val attempt = passwordRecoverAttemptRepository.findByUserEmail(EMAIL).first()

        recoverPasswordService.recover("n3w-s3cr3t", attempt.token, EMAIL)

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.allRecipients.single().toString()).isEqualTo(EMAIL)
        assertThat(message.subject).isEqualTo("Sua senha do webBudget foi alterada")
        assertThat(contents.multipartTypes).contains("multipart/alternative")
        assertThat(contents.html).contains("<html lang=\"pt-BR\"", "Pela recuperação de senha", "Foi você? Então está tudo certo.")
        assertThat(contents.html).contains("href=\"http://localhost:8086/auth/forgot-password\"")
        assertThat(contents.plainText).contains(
            "Olá, Test user.",
            "Como: Pela recuperação de senha",
            "Não reconhece a alteração? Crie uma senha nova agora e avise um administrador.",
            "Recuperar acesso: http://localhost:8086/auth/forgot-password"
        )
        assertThat(contents.plainText).containsPattern("Quando: \\d{2}/\\d{2}/\\d{4} às \\d{2}:\\d{2}")
    }

    @Test
    fun `should warn the owner in English when an administrator sets the password`() {

        val user = createLoginUser(EMAIL)
        setLanguage(user, Language.EN_US)

        userService.resetPassword(userRepository.findByEmail(EMAIL)!!, "n3w-s3cr3t")

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.subject).isEqualTo("Your webBudget password was changed")
        assertThat(contents.html).contains("<html lang=\"en-US\"", "By an administrator")
        assertThat(contents.html).doesNotContain("Through password recovery", "Was it you?")
        assertThat(contents.plainText).contains(
            "How: By an administrator",
            "An administrator set the new password. Sign in to webBudget with it.",
            "Don’t recognize this change? Create a new password now and tell an administrator."
        )
        assertThat(contents.plainText).containsPattern("When: [A-Z][a-z]{2} \\d{1,2}, \\d{4}, \\d{1,2}:\\d{2} [AP]M")
    }

    @Test
    fun `should say in Portuguese that the administrator set the password`() {

        val user = createLoginUser(EMAIL)

        userService.resetPassword(user, "n3w-s3cr3t")

        val contents = greenMail.receivedMessages.single().contents()

        assertThat(contents.plainText).contains(
            "Como: Por um administrador",
            "Foi um administrador que definiu a senha nova. Entre no webBudget com ela."
        )
        assertThat(contents.plainText).doesNotContain("Foi você?")
    }

    @Test
    fun `should send nothing when the recovery token is invalid`() {

        createLoginUser(EMAIL)

        assertThatThrownBy { recoverPasswordService.recover("n3w-s3cr3t", UUID.randomUUID(), EMAIL) }
            .isInstanceOf(DomainException::class.java)

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should send nothing when the administrator tries to change the own password`() {

        val admin = userRepository.findByEmail(User.ADMIN_USERNAME)!!

        restTestClient.patch()
            .uri("/private/v1/administration/users/${admin.externalId}/update-password")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"password": "new-secret", "temporary": true}""")
            .exchange()
            .expectStatus().isBadRequest

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should warn the owner that the two-step verification was reset`() {

        val user = createLoginUser(EMAIL)

        userService.resetTotp(user)

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.allRecipients.single().toString()).isEqualTo(EMAIL)
        assertThat(message.subject).isEqualTo("A verificação em duas etapas da sua conta foi redefinida")
        assertThat(contents.html).contains("<html lang=\"pt-BR\"", "Verificação em duas etapas redefinida")
        assertThat(contents.plainText).contains(
            "Os dispositivos confiáveis também foram esquecidos.",
            "o webBudget mostra um QR code",
            "Entrar no webBudget: http://localhost:8086/login",
            "Não pediu isso? Avise um administrador."
        )
    }

    @Test
    fun `should warn the owner about the reset in English`() {

        val user = createLoginUser(EMAIL)
        setLanguage(user, Language.EN_US)

        userService.resetTotp(userRepository.findByEmail(EMAIL)!!)

        val message = greenMail.receivedMessages.single()

        assertThat(message.subject).isEqualTo("Two-step verification was reset on your account")
        assertThat(message.contents().plainText)
            .contains("Didn’t ask for this? Tell an administrator.", "Sign in to webBudget: http://localhost:8086/login")
    }

    @Test
    fun `should send nothing when the administrator tries to reset the own two-step verification`() {

        val admin = userRepository.findByEmail(User.ADMIN_USERNAME)!!

        restTestClient.patch()
            .uri("/private/v1/administration/users/${admin.externalId}/totp-reset")
            .exchange()
            .expectStatus().isBadRequest

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    private fun setLanguage(user: User, language: Language) {
        dsl.update(USERS).set(USERS.DEFAULT_LANGUAGE, language.name).where(USERS.ID.eq(user.id)).execute()
    }

    private companion object {
        const val EMAIL = "owner@webbudget.com.br"
    }
}
