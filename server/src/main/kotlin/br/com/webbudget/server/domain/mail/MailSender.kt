package br.com.webbudget.server.domain.mail

import io.github.oshai.kotlinlogging.KotlinLogging
import jakarta.mail.internet.InternetAddress
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.MessageSource
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Component
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context
import java.nio.charset.StandardCharsets.UTF_8

private val logger = KotlinLogging.logger {}

@Component("webBudgetMailSender")
class MailSender(
    private val javaMailSender: JavaMailSender,
    @param:Qualifier("mailTemplateEngine")
    private val mailTemplateEngine: TemplateEngine,
    @param:Qualifier("mailMessageSource")
    private val mailMessageSource: MessageSource,
    @param:Value($$"${web-budget.mail.default-from-address}")
    private val defaultFromAddress: String,
    @param:Value($$"${web-budget.mail.reply-to-address}")
    private val replyToAddress: String,
    @param:Value($$"${web-budget.frontend-url}")
    private val frontendUrl: String
) {

    fun send(message: MailMessage) {
        try {
            deliver(message)
        } catch (exception: Exception) {
            logger.warn(exception) {
                "Could not send the e-mail [${message.templateName}] to ${message.to.map { it.withoutLineBreaks() }}"
            }
        }
    }

    private fun deliver(message: MailMessage) {

        val subject = mailMessageSource
            .getMessage("${message.messageKey}.subject", message.subjectArgs.toTypedArray(), message.locale)
            .withoutLineBreaks()

        val html = render(message, subject)

        val mimeMessage = javaMailSender.createMimeMessage()

        MimeMessageHelper(mimeMessage, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, UTF_8.name()).apply {
            setFrom(InternetAddress(defaultFromAddress, "webBudget"))
            setReplyTo(replyToAddress)
            setTo(message.to.toTypedArray())
            setSubject(subject)
            setText(MailPlainText.from(html), html)
        }

        javaMailSender.send(mimeMessage)

        logger.debug { "E-mail [${message.templateName}] sent to ${message.to.map { it.withoutLineBreaks() }}" }
    }

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
        private val LINE_BREAKS = Regex("[\r\n]+")
    }
}
