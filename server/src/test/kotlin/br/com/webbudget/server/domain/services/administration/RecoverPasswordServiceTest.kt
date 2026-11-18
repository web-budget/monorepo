package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.infrastructure.repository.administration.PasswordRecoverAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.jdbc.Sql
import java.time.LocalDateTime
import java.util.UUID

@Sql("/sql/administration/clear-tables.sql", "/sql/administration/create-user.sql")
class RecoverPasswordServiceTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var recoverPasswordService: RecoverPasswordService

    @Autowired
    private lateinit var passwordRecoverAttemptRepository: PasswordRecoverAttemptRepository

    @ParameterizedTest
    @CsvSource(
        "other-user@webbudget.com.br, Password recovery",
        "user@webbudget.com.br, Recuperação de senha"
    )
    fun `should send the recovery e-mail in the language of the user`(userEmail: String, expectedSubject: String) {

        recoverPasswordService.registerRecoveryAttempt(userEmail)

        val message = greenMail.receivedMessages.single()

        assertThat(message.subject).isEqualTo(expectedSubject)
        assertThat(message.allRecipients.map { it.toString() }).containsExactly(userEmail)
        assertThat(passwordRecoverAttemptRepository.findByUserEmail(userEmail)).hasSize(1)
    }

    @Test
    fun `should ignore the request for an unknown account`() {

        recoverPasswordService.registerRecoveryAttempt("unknown@webbudget.com.br")

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should recover the password and mark the attempt as used`() {

        recoverPasswordService.registerRecoveryAttempt("user@webbudget.com.br")
        val attempt = passwordRecoverAttemptRepository.findByUserEmail("user@webbudget.com.br").single()

        recoverPasswordService.recover("n3w-s3cr3t", attempt.token, "user@webbudget.com.br")

        val user = userRepository.findByEmail("user@webbudget.com.br")!!

        assertThat(passwordEncoder.matches("n3w-s3cr3t", user.password)).isTrue()
        assertThat(passwordRecoverAttemptRepository.findByUserEmail("user@webbudget.com.br").single().used).isTrue()
    }

    @Test
    fun `should fail when the token was already used`() {

        recoverPasswordService.registerRecoveryAttempt("user@webbudget.com.br")
        val attempt = passwordRecoverAttemptRepository.findByUserEmail("user@webbudget.com.br").single()

        recoverPasswordService.recover("n3w-s3cr3t", attempt.token, "user@webbudget.com.br")

        assertThatThrownBy { recoverPasswordService.recover("other", attempt.token, "user@webbudget.com.br") }
            .isInstanceOf(DomainException::class.java)
    }

    @Test
    fun `should fail for an unknown token`() {

        assertThatThrownBy { recoverPasswordService.recover("secret", UUID.randomUUID(), "user@webbudget.com.br") }
            .isInstanceOf(DomainException::class.java)
    }

    @Test
    fun `should fail when the token is expired`() {

        recoverPasswordService.registerRecoveryAttempt("user@webbudget.com.br")
        val attempt = passwordRecoverAttemptRepository.findByUserEmail("user@webbudget.com.br").single()

        passwordRecoverAttemptRepository.update(attempt.apply { validity = LocalDateTime.now().minusMinutes(1) })

        assertThatThrownBy { recoverPasswordService.recover("secret", attempt.token, "user@webbudget.com.br") }
            .isInstanceOf(DomainException::class.java)
    }
}
