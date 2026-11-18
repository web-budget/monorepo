package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.AccountActivationAttempt
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_TOKEN
import br.com.webbudget.server.domain.mail.AccountActivationEmail
import br.com.webbudget.server.domain.mail.MailRequested
import br.com.webbudget.server.infrastructure.repository.administration.AccountActivationAttemptRepository
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
class AccountActivationService(
    @param:Value($$"${web-budget.frontend-url}")
    private val frontendUrl: String,
    private val userRepository: UserRepository,
    private val accountMailNotifier: AccountMailNotifier,
    private val applicationEventPublisher: ApplicationEventPublisher,
    private val accountActivationAttemptRepository: AccountActivationAttemptRepository
) {

    @Transactional
    fun requestActivation(userName: String) {

        val user = userRepository.findByEmail(userName)

        if (user == null) {
            logger.warn { "Can't find any account with username [$userName], ignoring event" }
            return
        }

        val activationAttempt = accountActivationAttemptRepository.insert(AccountActivationAttempt(UUID.randomUUID(), user))

        val formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
        val activationUrl = "$frontendUrl/auth/account-activation" +
                "?token=${activationAttempt.token}&email=${user.email}"

        val mailMessage = AccountActivationEmail(user)
        mailMessage.addVariable("activateAccountUrl", activationUrl)
        mailMessage.addVariable("validUntil", activationAttempt.validity.format(formatter))

        applicationEventPublisher.publishEvent(MailRequested(mailMessage))
    }

    @Transactional
    fun activate(token: UUID, userEmail: String) {

        val attempt = accountActivationAttemptRepository.findPendingByTokenAndUserEmail(token, userEmail)
            ?: throw DomainException("Invalid token provided for user [$userEmail]", INVALID_TOKEN)

        if (attempt.validity.isBefore(LocalDateTime.now())) {
            logger.debug { "Account activation token has expired on [${attempt.validity}]" }
            throw DomainException("Invalid token provided for user [$userEmail]", INVALID_TOKEN)
        }

        attempt.activatedOn = LocalDateTime.now()
        accountActivationAttemptRepository.update(attempt)

        attempt.user.active = true
        userRepository.update(attempt.user)

        if (attempt.user.status == UserStatus.PENDING) {
            accountMailNotifier.notifyPendingApproval(attempt.user)
        }
    }
}
