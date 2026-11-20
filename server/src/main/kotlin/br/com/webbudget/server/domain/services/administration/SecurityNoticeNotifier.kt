package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.mail.MailDateFormatter
import br.com.webbudget.server.domain.mail.MailLinkBuilder
import br.com.webbudget.server.domain.mail.MailMessage
import br.com.webbudget.server.domain.mail.MailMessageRequested
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component
import java.time.LocalDateTime

@Component
class SecurityNoticeNotifier(
    private val applicationEventPublisher: ApplicationEventPublisher,
    private val mailLinkBuilder: MailLinkBuilder,
    private val mailDateFormatter: MailDateFormatter
) {

    fun notifyPasswordChanged(user: User, changedBy: PasswordChangedBy) {
        publish(
            user,
            "password-changed",
            mapOf(
                "changedAt" to formattedNow(user),
                "changedBy" to changedBy.name,
                "recoverUrl" to mailLinkBuilder.build("/auth/forgot-password")
            )
        )
    }

    fun notifyTotpReset(user: User) {
        publish(user, "totp-reset", mapOf("loginUrl" to mailLinkBuilder.build("/login")))
    }

    fun notifyGoogleAccountLinked(user: User) {
        publish(user, "google-linked", mapOf("linkedAt" to formattedNow(user), "userEmail" to user.email))
    }

    private fun formattedNow(user: User) = mailDateFormatter.format(LocalDateTime.now(), user.defaultLanguage)

    private fun publish(user: User, templateName: String, variables: Map<String, Any?>) {
        applicationEventPublisher.publishEvent(
            MailMessageRequested(
                MailMessage(listOf(user.email), templateName, user.defaultLanguage.locale, variables + ("userName" to user.name))
            )
        )
    }
}
