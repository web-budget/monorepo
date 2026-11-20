package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.Language.EN_US
import br.com.webbudget.server.domain.entities.administration.Language.PT_BR
import br.com.webbudget.server.infrastructure.config.MailTemplateConfiguration
import br.com.webbudget.server.utilities.contents
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatCode
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.MessageSource
import org.springframework.context.support.StaticMessageSource
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.JavaMailSenderImpl
import org.thymeleaf.TemplateEngine
import java.net.ServerSocket
import java.util.Locale

class MailSenderTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var mailSender: MailSender

    @Autowired
    private lateinit var javaMailSender: JavaMailSender

    @Autowired
    private lateinit var applicationEventPublisher: ApplicationEventPublisher

    @Autowired
    @field:Qualifier("mailTemplateEngine")
    private lateinit var mailTemplateEngine: TemplateEngine

    @Autowired
    @field:Qualifier("mailMessageSource")
    private lateinit var mailMessageSource: MessageSource

    private fun approvedAccount(language: Language, to: String = "maria@webbudget.com.br") = MailMessage(
        to = listOf(to),
        templateName = "account-approved",
        locale = language.locale,
        variables = mapOf(
            "userName" to "Maria Souza",
            "userEmail" to to,
            "roles" to "Financeiro, Cadastros",
            "loginUrl" to "https://webbudget.example.com/login"
        )
    )

    @Test
    fun `should send HTML with a plain text alternative and the subject in Portuguese`() {

        mailSender.send(approvedAccount(PT_BR))

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.subject).isEqualTo("Sua conta no webBudget foi aprovada")
        assertThat(message.allRecipients.single().toString()).isEqualTo("maria@webbudget.com.br")
        assertThat(message.from.single().toString()).contains("webBudget", "noreply@webbudget.com.br")
        assertThat(message.replyTo.single().toString()).isEqualTo("noreply@webbudget.com.br")
        assertThat(contents.multipartTypes).contains("multipart/alternative")
        assertThat(contents.html).contains("<html lang=\"pt-BR\"", "<title>Sua conta no webBudget foi aprovada</title>")
        assertThat(contents.html).contains("Você já pode entrar. Estas são as áreas liberadas para você.")
        assertThat(contents.plainText).contains("Sua conta foi aprovada", "E-mail de acesso: maria@webbudget.com.br")
        assertThat(contents.plainText).contains("Entrar no webBudget: https://webbudget.example.com/login")
        assertThat(contents.plainText).doesNotContain("<", "Você já pode entrar. Estas são")
    }

    @Test
    fun `should send the subject and the text in English for an English recipient`() {

        mailSender.send(approvedAccount(EN_US))

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.subject).isEqualTo("Your webBudget account was approved")
        assertThat(contents.html).contains("<html lang=\"en-US\"", "Sign in to webBudget")
        assertThat(contents.plainText).contains("Your account was approved", "Sign-in email: maria@webbudget.com.br")
    }

    @Test
    fun `should send a message requested through the event`() {

        applicationEventPublisher.publishEvent(MailMessageRequested(approvedAccount(PT_BR, "evento@webbudget.com.br")))

        assertThat(greenMail.receivedMessages.single().allRecipients.single().toString()).isEqualTo("evento@webbudget.com.br")
    }

    @Test
    fun `should never throw when the SMTP server is down`() {

        val closedPort = ServerSocket(0).use { socket -> socket.localPort }

        val unreachable = JavaMailSenderImpl().apply {
            host = "127.0.0.1"
            port = closedPort
        }

        val failingSender = MailSender(
            unreachable, mailTemplateEngine, mailMessageSource, "noreply@webbudget.com.br", "noreply@webbudget.com.br",
            "https://webbudget.example.com"
        )

        assertThatCode { failingSender.send(approvedAccount(PT_BR)) }.doesNotThrowAnyException()
        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should never throw for a template without a subject`() {

        val message = MailMessage(listOf("maria@webbudget.com.br"), "unknown-template", PT_BR.locale)

        assertThatCode { mailSender.send(message) }.doesNotThrowAnyException()
        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should strip line breaks from a subject that carries user data`() {

        val messages = StaticMessageSource().apply {
            addMessage("subject-check.subject", Locale.forLanguageTag("pt-BR"), "Olá, {0}")
        }
        val configuration = MailTemplateConfiguration()
        val sender = MailSender(
            javaMailSender, configuration.mailTemplateEngine(messages), messages, "noreply@webbudget.com.br",
            "noreply@webbudget.com.br", "https://webbudget.example.com"
        )

        sender.send(
            MailMessage(
                to = listOf("maria@webbudget.com.br"),
                templateName = "subject-check",
                locale = PT_BR.locale,
                variables = mapOf("userName" to "Maria"),
                subjectArgs = listOf("Maria\r\nBcc: alguem@example.com")
            )
        )

        val message = greenMail.receivedMessages.single()

        assertThat(message.subject).isEqualTo("Olá, Maria Bcc: alguem@example.com")
        assertThat(message.getHeader("Bcc")).isNull()
    }
}
