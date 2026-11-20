package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.infrastructure.repository.administration.AccountActivationAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.assertj.core.api.Assertions.fail
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.jdbc.Sql
import java.time.LocalDateTime
import java.util.UUID

@Sql("/sql/administration/clear-tables.sql", "/sql/administration/create-user.sql")
class AccountActivationServiceTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var accountActivationService: AccountActivationService

    @Autowired
    private lateinit var accountActivationAttemptRepository: AccountActivationAttemptRepository

    @ParameterizedTest
    @CsvSource(
        "other-user@webbudget.com.br, Activate your webBudget account, Activate your account",
        "user@webbudget.com.br, Ative sua conta no webBudget, Ative sua conta"
    )
    fun `should send the activation e-mail in the language of the user`(
        userEmail: String,
        expectedSubject: String,
        expectedHeading: String
    ) {

        accountActivationService.requestActivation(userEmail)

        val message = greenMail.receivedMessages.single()

        assertThat(message.subject).isEqualTo(expectedSubject)
        assertThat(message.allRecipients.map { it.toString() }).containsExactly(userEmail)
        assertThat(message.from.map { it.toString() }).containsExactly("webBudget <noreply@webbudget.com.br>")
        assertThat(htmlOf(message)).contains(expectedHeading)

        val attempt = accountActivationAttemptRepository.findByUserEmail(userEmail).single()

        assertThat(htmlOf(message)).contains("token=${attempt.token}")
    }

    @Test
    fun `should ignore the request for an unknown account`() {

        accountActivationService.requestActivation("unknown@webbudget.com.br")

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should activate the account and mark the attempt`() {

        accountActivationService.requestActivation("other-user@webbudget.com.br")

        val attempt = accountActivationAttemptRepository.findByUserEmail("other-user@webbudget.com.br").single()

        accountActivationService.activate(attempt.token, "other-user@webbudget.com.br")

        assertThat(
            accountActivationAttemptRepository.findPendingByTokenAndUserEmail(attempt.token, attempt.user.email)
        ).isNull()
        assertThat(userRepository.findByEmail("other-user@webbudget.com.br")?.active).isTrue()
    }

    @Test
    fun `should fail for an unknown token`() {

        assertThatThrownBy { accountActivationService.activate(UUID.randomUUID(), "unknown@webbudget.com.br") }
            .isInstanceOf(DomainException::class.java)
    }

    @Test
    fun `should fail when the token was already used`() {

        accountActivationService.requestActivation("other-user@webbudget.com.br")
        val attempt = accountActivationAttemptRepository.findByUserEmail("other-user@webbudget.com.br").single()

        accountActivationService.activate(attempt.token, "other-user@webbudget.com.br")

        assertThatThrownBy { accountActivationService.activate(attempt.token, "other-user@webbudget.com.br") }
            .isInstanceOf(DomainException::class.java)
    }

    @Test
    fun `should fail when the token is expired`() {

        accountActivationService.requestActivation("other-user@webbudget.com.br")
        val attempt = accountActivationAttemptRepository.findByUserEmail("other-user@webbudget.com.br").single()

        accountActivationAttemptRepository.update(attempt.apply { validity = LocalDateTime.now().minusMinutes(1) })

        assertThatThrownBy { accountActivationService.activate(attempt.token, "other-user@webbudget.com.br") }
            .isInstanceOf(DomainException::class.java)

        assertThat(userRepository.findByEmail("other-user@webbudget.com.br")?.active ?: fail("user not found"))
            .isFalse()
    }

    private fun htmlOf(message: MimeMessage): String = message.content.let { content ->
        val multipart = content as jakarta.mail.Multipart
        (0 until multipart.count).joinToString("") { index -> extractText(multipart.getBodyPart(index)) }
    }

    private fun extractText(part: jakarta.mail.BodyPart): String = when (val content = part.content) {
        is String -> content
        is jakarta.mail.Multipart -> (0 until content.count).joinToString("") { extractText(content.getBodyPart(it)) }
        else -> ""
    }
}
