package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.AccountActivationAttempt
import br.com.webbudget.server.domain.entities.administration.PasswordRecoverAttempt
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.mail.MailDateFormatter
import br.com.webbudget.server.domain.mail.MailLinkBuilder
import br.com.webbudget.server.domain.mail.MailMessage
import br.com.webbudget.server.domain.mail.MailMessageRequested
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.MessageSource
import org.springframework.stereotype.Component
import java.time.LocalDateTime

private val logger = KotlinLogging.logger {}

@Component
class AccountMailNotifier(
    private val userRepository: UserRepository,
    private val applicationEventPublisher: ApplicationEventPublisher,
    private val mailLinkBuilder: MailLinkBuilder,
    private val mailDateFormatter: MailDateFormatter,
    @param:Qualifier("mailMessageSource")
    private val mailMessageSource: MessageSource
) {

    fun notifyAccountActivation(user: User, attempt: AccountActivationAttempt) {

        val selfRegistered = user.status == UserStatus.PENDING

        val variables = mapOf(
            "selfRegistered" to selfRegistered,
            "userName" to user.name,
            "userEmail" to user.email,
            "validityDays" to AccountActivationAttempt.VALIDITY_DAYS,
            "activationUrl" to mailLinkBuilder.build(
                "/auth/account-activation", mapOf("token" to attempt.token.toString(), "email" to user.email)
            )
        )

        val messageKey = if (selfRegistered) "account-activation.self-registration" else "account-activation.administrator-created"

        publish(MailMessage(listOf(user.email), "account-activation", user.defaultLanguage.locale, variables, messageKey = messageKey))
    }

    fun notifyPasswordRecovery(user: User, attempt: PasswordRecoverAttempt) {

        val variables = mapOf(
            "userName" to user.name,
            "validityHours" to PasswordRecoverAttempt.VALIDITY_HOURS,
            "recoveryUrl" to mailLinkBuilder.build(
                "/auth/recover-password", mapOf("token" to attempt.token.toString(), "email" to user.email)
            )
        )

        publish(
            MailMessage(
                listOf(user.email), "recover-password", user.defaultLanguage.locale, variables,
                preheaderArgs = listOf(PasswordRecoverAttempt.VALIDITY_HOURS)
            )
        )
    }

    fun notifyPendingApproval(newUser: User) {

        val administrators = userRepository.findApprovedAdministrators()

        if (administrators.isEmpty()) {
            logger.info { "No approved administrator to notify about the user [${newUser.email}] waiting for approval" }
            return
        }

        administrators.forEach { administrator -> publishPendingApproval(administrator, newUser) }
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

        publish(MailMessage(listOf(user.email), "account-approved", locale, variables))
    }

    private fun publishPendingApproval(administrator: User, newUser: User) {

        val language = administrator.defaultLanguage

        val variables = mapOf(
            "recipientName" to administrator.name,
            "userName" to newUser.name,
            "userEmail" to newUser.email,
            "signUpMethod" to mailMessageSource.getMessage("auth-provider.${newUser.authProvider}", null, language.locale),
            "createdAt" to mailDateFormatter.format(newUser.createdOn ?: LocalDateTime.now(), language),
            "reviewUrl" to mailLinkBuilder.build("/configuration/users", mapOf("status" to UserStatus.PENDING.name))
        )

        publish(
            MailMessage(
                listOf(administrator.email), "user-pending-approval", language.locale, variables, listOf(newUser.name)
            )
        )
    }

    fun notifyAccountBlocked(user: User) {
        publish(user, "account-blocked", mapOf("userName" to user.name))
    }

    fun notifyAccountUnblocked(user: User) {
        publish(user, "account-unblocked", mapOf("userName" to user.name, "loginUrl" to mailLinkBuilder.build("/login")))
    }

    private fun publish(user: User, templateName: String, variables: Map<String, Any?>) {
        publish(MailMessage(listOf(user.email), templateName, user.defaultLanguage.locale, variables))
    }

    private fun publish(message: MailMessage) {
        applicationEventPublisher.publishEvent(MailMessageRequested(message))
    }

    companion object {
        private val ROLES_IN_DISPLAY_ORDER = listOf(Role.DASHBOARDS, Role.FINANCIAL, Role.REGISTRATION, Role.ADMINISTRATION)
    }
}
