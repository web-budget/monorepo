package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.PasswordRecoverAttempt
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_TOKEN
import br.com.webbudget.server.domain.mail.MailRequested
import br.com.webbudget.server.domain.mail.RecoverPasswordEmail
import br.com.webbudget.server.infrastructure.repository.administration.PasswordRecoverAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

private val logger = KotlinLogging.logger {}

@Service
@Transactional(readOnly = true)
class RecoverPasswordService(
    @param:Value($$"${web-budget.frontend-url}")
    private val frontendUrl: String,
    private val userService: UserService,
    private val securityNoticeNotifier: SecurityNoticeNotifier,
    private val userRepository: UserRepository,
    private val applicationEventPublisher: ApplicationEventPublisher,
    private val passwordRecoverAttemptRepository: PasswordRecoverAttemptRepository
) {

    @Transactional
    fun registerRecoveryAttempt(userEmail: String) {

        val user = userRepository.findByEmail(userEmail)

        if (user == null) {
            logger.warn { "No user found with e-mail [$userEmail], ignoring password recover request" }
            return
        }

        val recoverAttempt = passwordRecoverAttemptRepository.insert(PasswordRecoverAttempt(UUID.randomUUID(), user))

        val formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
        val recoverPasswordUrl = "$frontendUrl/auth/recover-password" +
                "?token=${recoverAttempt.token}&email=${user.email}"

        val mailMessage = RecoverPasswordEmail(user)
        mailMessage.addVariable("recoverPasswordUrl", recoverPasswordUrl)
        mailMessage.addVariable("validUntil", recoverAttempt.validity.format(formatter))

        applicationEventPublisher.publishEvent(MailRequested(mailMessage))
    }

    @Transactional
    fun recover(newPassword: String, recoveryToken: UUID, userEmail: String) {

        val attempt = passwordRecoverAttemptRepository.findUnusedByTokenAndUserEmail(recoveryToken, userEmail)
            ?: throw DomainException("Invalid token provided for user [$userEmail]", INVALID_TOKEN)

        if (attempt.validity.isBefore(LocalDateTime.now())) {
            logger.debug { "Recover password token has expired on [${attempt.validity}]" }
            throw DomainException("Invalid token provided for user [$userEmail]", INVALID_TOKEN)
        }

        userService.updatePassword(attempt.user, newPassword)

        securityNoticeNotifier.notifyPasswordChanged(attempt.user, PasswordChangedBy.RECOVERY)

        attempt.used = true
        passwordRecoverAttemptRepository.update(attempt)
    }
}
