package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.entities.administration.MailSecurity
import br.com.webbudget.server.domain.entities.administration.MailSettings
import br.com.webbudget.server.domain.exceptions.MailDeliveryFailedException
import br.com.webbudget.server.domain.exceptions.MailNotConfiguredException
import br.com.webbudget.server.infrastructure.repository.administration.MailSettingsRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import jakarta.mail.MessagingException
import jakarta.mail.internet.InternetAddress
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.MessageSource
import org.springframework.mail.javamail.JavaMailSenderImpl
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Component
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context
import java.nio.charset.StandardCharsets.UTF_8
import java.util.Properties

private val logger = KotlinLogging.logger {}

@Component("webBudgetMailSender")
class MailSender(
    private val mailSettingsRepository: MailSettingsRepository,
    private val mailPasswordCipher: MailPasswordCipher,
    @param:Qualifier("mailTemplateEngine")
    private val mailTemplateEngine: TemplateEngine,
    @param:Qualifier("mailMessageSource")
    private val mailMessageSource: MessageSource,
    @param:Value($$"${web-budget.frontend-url}")
    private val frontendUrl: String
) {

    fun send(message: MailMessage) {
        try {
            val settings = mailSettingsRepository.find()

            when {
                !settings.isConfigured() -> logger.warn {
                    "The e-mail is not configured, so the sending of [${message.templateName}] was skipped"
                }

                !settings.enabled -> logger.info {
                    "The e-mail sending is turned off, so the sending of [${message.templateName}] was skipped"
                }

                else -> deliver(settings, message)
            }
        } catch (exception: Exception) {
            logger.warn(exception) {
                "Could not send the e-mail [${message.templateName}] to ${message.to.map { it.withoutLineBreaks() }}"
            }
        }
    }

    fun sendTest(message: MailMessage) {

        val settings = mailSettingsRepository.find()

        if (!settings.isConfigured()) {
            throw MailNotConfiguredException()
        }

        try {
            deliver(settings, message)
        } catch (exception: Exception) {
            throw MailDeliveryFailedException(describe(exception), exception)
        }
    }

    private fun deliver(settings: MailSettings, message: MailMessage) {

        val subject = mailMessageSource
            .getMessage("${message.messageKey}.subject", message.subjectArgs.toTypedArray(), message.locale)
            .withoutLineBreaks()

        val html = render(message, subject)

        val javaMailSender = javaMailSenderFor(settings, passwordOf(settings))
        val mimeMessage = javaMailSender.createMimeMessage()

        MimeMessageHelper(mimeMessage, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, UTF_8.name()).apply {
            setFrom(InternetAddress(settings.fromAddress!!, settings.fromName ?: DEFAULT_FROM_NAME))
            settings.replyToAddress?.let { setReplyTo(it) }
            setTo(message.to.toTypedArray())
            setSubject(subject)
            setText(MailPlainText.from(html), html)
        }

        javaMailSender.send(mimeMessage)

        logger.debug { "E-mail [${message.templateName}] sent to ${message.to.map { it.withoutLineBreaks() }}" }
    }

    private fun passwordOf(settings: MailSettings): String? = settings.passwordCiphertext
        ?.takeIf { settings.username != null && mailPasswordCipher.isAvailable() }
        ?.let(mailPasswordCipher::decrypt)

    private fun render(message: MailMessage, subject: String): String {

        val preheader = mailMessageSource.getMessage("${message.messageKey}.preheader", message.preheaderArgs.toTypedArray(), "", message.locale)

        val context = Context(message.locale).apply {
            setVariables(message.variables)
            setVariable("subject", subject)
            setVariable("preheader", preheader)
            setVariable("applicationUrl", frontendUrl)
        }

        return mailTemplateEngine.process(message.templateName, context)
    }

    private fun String.withoutLineBreaks() = replace(LINE_BREAKS, " ")

    companion object {

        private const val DEFAULT_FROM_NAME = "webBudget"
        private const val TIMEOUT_MILLISECONDS = "15000"
        private val LINE_BREAKS = Regex("[\r\n]+")

        fun javaMailSenderFor(settings: MailSettings, password: String?): JavaMailSenderImpl = JavaMailSenderImpl().apply {
            host = settings.host
            port = settings.port!!
            username = settings.username
            this.password = password
            defaultEncoding = UTF_8.name()
            javaMailProperties = smtpPropertiesFor(settings)
        }

        fun smtpPropertiesFor(settings: MailSettings): Properties = Properties().apply {
            setProperty("mail.smtp.auth", (settings.username != null).toString())
            setProperty("mail.smtp.connectiontimeout", TIMEOUT_MILLISECONDS)
            setProperty("mail.smtp.timeout", TIMEOUT_MILLISECONDS)
            setProperty("mail.smtp.writetimeout", TIMEOUT_MILLISECONDS)
            if (settings.security == MailSecurity.STARTTLS) {
                setProperty("mail.smtp.starttls.enable", "true")
                setProperty("mail.smtp.starttls.required", "true")
            }
            if (settings.security == MailSecurity.SSL_TLS) {
                setProperty("mail.smtp.ssl.enable", "true")
            }
        }

        fun describe(exception: Throwable): String {

            val causes = generateSequence(exception) { it.cause }.toList()

            val messagingException = causes.firstOrNull { it is MessagingException && !it.message.isNullOrBlank() }

            return messagingException?.message
                ?: causes.lastOrNull { !it.message.isNullOrBlank() }?.message
                ?: exception.javaClass.simpleName
        }
    }
}
