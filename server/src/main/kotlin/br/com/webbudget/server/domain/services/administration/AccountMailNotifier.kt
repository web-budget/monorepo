package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.mail.AccountApprovedEmail
import br.com.webbudget.server.domain.mail.MailRequested
import br.com.webbudget.server.domain.mail.MailTemplate
import br.com.webbudget.server.domain.mail.UserPendingApprovalEmail
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component

private val logger = KotlinLogging.logger {}

@Component
class AccountMailNotifier(
    private val userRepository: UserRepository,
    private val applicationEventPublisher: ApplicationEventPublisher
) {

    fun notifyPendingApproval(newUser: User) {

        val administrators = userRepository.findApprovedAdministrators()

        if (administrators.isEmpty()) {
            logger.info { "No approved administrator to notify about the user [${newUser.email}] waiting for approval" }
            return
        }

        administrators.forEach { administrator -> publish(UserPendingApprovalEmail(administrator, newUser)) }
    }

    fun notifyAccountApproved(user: User) {
        publish(AccountApprovedEmail(user))
    }

    private fun publish(template: MailTemplate) {
        applicationEventPublisher.publishEvent(MailRequested(template))
    }
}
