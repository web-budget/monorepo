package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.mail.MailLinkBuilder
import br.com.webbudget.server.domain.mail.MailMessage
import br.com.webbudget.server.domain.mail.MailMessageRequested
import br.com.webbudget.server.domain.mail.MailRequested
import br.com.webbudget.server.domain.mail.MailTemplate
import br.com.webbudget.server.domain.mail.UserPendingApprovalEmail
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.MessageSource
import org.springframework.stereotype.Component

private val logger = KotlinLogging.logger {}

@Component
class AccountMailNotifier(
    private val userRepository: UserRepository,
    private val applicationEventPublisher: ApplicationEventPublisher,
    private val mailLinkBuilder: MailLinkBuilder,
    @param:Qualifier("mailMessageSource")
    private val mailMessageSource: MessageSource
) {

    fun notifyPendingApproval(newUser: User) {

        val administrators = userRepository.findApprovedAdministrators()

        if (administrators.isEmpty()) {
            logger.info { "No approved administrator to notify about the user [${newUser.email}] waiting for approval" }
            return
        }

        administrators.forEach { administrator -> publish(UserPendingApprovalEmail(administrator, newUser)) }
    }

    fun notifyAccountApproved(user: User, roleNames: Collection<String>) {

        val locale = user.defaultLanguage.locale

        val roles = ROLES_IN_DISPLAY_ORDER
            .filter { roleName -> roleName in roleNames }
            .joinToString(", ") { roleName -> mailMessageSource.getMessage("role.$roleName", null, locale) }

        val variables = mapOf(
            "userName" to user.name,
            "userEmail" to user.email,
            "roles" to roles,
            "loginUrl" to mailLinkBuilder.build("/login")
        )

        applicationEventPublisher.publishEvent(
            MailMessageRequested(MailMessage(listOf(user.email), "account-approved", locale, variables))
        )
    }

    private fun publish(template: MailTemplate) {
        applicationEventPublisher.publishEvent(MailRequested(template))
    }

    companion object {
        private val ROLES_IN_DISPLAY_ORDER = listOf(Role.DASHBOARDS, Role.FINANCIAL, Role.REGISTRATION, Role.ADMINISTRATION)
    }
}
