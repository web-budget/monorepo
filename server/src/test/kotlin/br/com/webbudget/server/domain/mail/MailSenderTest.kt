package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.Language.EN_US
import br.com.webbudget.server.domain.entities.administration.Language.PT_BR
import br.com.webbudget.server.domain.entities.administration.MailSecurity
import br.com.webbudget.server.domain.entities.administration.MailSettings
import br.com.webbudget.server.domain.exceptions.MailDeliveryFailedException
import br.com.webbudget.server.domain.exceptions.MailNotConfiguredException
import br.com.webbudget.server.domain.services.administration.MailSettingsService
import br.com.webbudget.server.infrastructure.config.MailTemplateConfiguration
import br.com.webbudget.server.infrastructure.repository.administration.MailSettingsRepository
import br.com.webbudget.server.jooq.administration.tables.references.MAIL_SETTINGS
import br.com.webbudget.server.utilities.contents
import jakarta.mail.MessagingException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatCode
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.system.CapturedOutput
import org.springframework.boot.test.system.OutputCaptureExtension
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.MessageSource
import org.springframework.context.support.StaticMessageSource
import org.thymeleaf.TemplateEngine
import java.net.ServerSocket
import java.util.Locale

@ExtendWith(OutputCaptureExtension::class)
class MailSenderTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var mailSender: MailSender

    @Autowired
    private lateinit var mailSettingsService: MailSettingsService

    @Autowired
    private lateinit var mailSettingsRepository: MailSettingsRepository

    @Autowired
    private lateinit var mailPasswordCipher: MailPasswordCipher

    @Autowired
    private lateinit var dsl: DSLContext

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

    private fun senderWith(
        engine: TemplateEngine = mailTemplateEngine,
        messages: MessageSource = mailMessageSource,
        cipher: MailPasswordCipher = mailPasswordCipher
    ) = MailSender(mailSettingsRepository, cipher, engine, messages, "https://webbudget.example.com")

    private fun server(
        host: String = "127.0.0.1",
        port: Int = greenMail.smtp.port,
        security: MailSecurity = MailSecurity.NONE,
        username: String? = null,
        fromName: String? = null,
        replyToAddress: String? = null
    ) = MailSettings(
        host = host,
        port = port,
        security = security,
        username = username,
        fromAddress = MAIL_FROM_ADDRESS,
        fromName = fromName,
        replyToAddress = replyToAddress
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
    fun `should use the settings saved at the moment of each sending`() {

        mailSender.send(approvedAccount(PT_BR, "first@webbudget.com.br"))

        val closedPort = ServerSocket(0).use { socket -> socket.localPort }
        mailSettingsService.update(server(port = closedPort), null)
        mailSender.send(approvedAccount(PT_BR, "lost@webbudget.com.br"))

        mailSettingsService.update(server(), null)
        mailSender.send(approvedAccount(PT_BR, "second@webbudget.com.br"))

        assertThat(greenMail.receivedMessages.map { it.allRecipients.single().toString() })
            .containsExactlyInAnyOrder("first@webbudget.com.br", "second@webbudget.com.br")
    }

    @Test
    fun `should skip the sending and warn when no server is saved`(output: CapturedOutput) {

        clearMailSettings()

        mailSender.send(approvedAccount(PT_BR))

        assertThat(greenMail.receivedMessages).isEmpty()
        assertThat(output.all).contains("The e-mail is not configured, so the sending of [account-approved] was skipped")
    }

    @Test
    fun `should skip the sending and log it when the sending is turned off`(output: CapturedOutput) {

        mailSettingsService.updateEnabled(false)

        mailSender.send(approvedAccount(PT_BR))

        assertThat(greenMail.receivedMessages).isEmpty()
        assertThat(output.all).contains("The e-mail sending is turned off, so the sending of [account-approved] was skipped")
    }

    @Test
    fun `should send as webBudget when the settings have no sender name and without reply-to when none is saved`() {

        mailSettingsService.update(server(), null)

        mailSender.send(approvedAccount(PT_BR))

        val message = greenMail.receivedMessages.single()

        assertThat(message.from.single().toString()).isEqualTo("webBudget <noreply@webbudget.com.br>")
        assertThat(message.getHeader("Reply-To")).isNull()
    }

    @Test
    fun `should send with the saved sender name and reply-to`() {

        mailSettingsService.update(server(fromName = "Casa da Maria", replyToAddress = "help@webbudget.com.br"), null)

        mailSender.send(approvedAccount(PT_BR))

        val message = greenMail.receivedMessages.single()

        assertThat(message.from.single().toString()).isEqualTo("Casa da Maria <noreply@webbudget.com.br>")
        assertThat(message.replyTo.single().toString()).isEqualTo("help@webbudget.com.br")
    }

    @Test
    fun `should send without authentication when the settings have no username`() {

        mailSettingsService.update(server(username = "mailer"), "secret")
        dsl.update(MAIL_SETTINGS).setNull(MAIL_SETTINGS.USERNAME).where(MAIL_SETTINGS.ID.eq(1)).execute()

        mailSender.send(approvedAccount(PT_BR))

        assertThat(greenMail.receivedMessages).hasSize(1)
    }

    @Test
    fun `should not deliver when the saved password cannot be decrypted without a key`() {

        mailSender.send(approvedAccount(PT_BR))
        greenMail.purgeEmailFromAllMailboxes()

        senderWith(cipher = MailPasswordCipher("")).send(approvedAccount(PT_BR))

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should never throw when the SMTP server is down`() {

        val closedPort = ServerSocket(0).use { socket -> socket.localPort }
        mailSettingsService.update(server(port = closedPort), null)

        assertThatCode { mailSender.send(approvedAccount(PT_BR)) }.doesNotThrowAnyException()
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
        val sender = senderWith(engine = configuration.mailTemplateEngine(messages), messages = messages)

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

    @Test
    fun `should deliver the test e-mail even with the sending turned off`() {

        mailSettingsService.updateEnabled(false)

        mailSender.sendTest(MailMessage(listOf("admin@webbudget.com.br"), "mail-test", PT_BR.locale))

        assertThat(greenMail.receivedMessages.single().subject).isEqualTo("E-mail de teste do webBudget")
    }

    @Test
    fun `should refuse the test e-mail without a saved server`() {

        clearMailSettings()

        assertThatThrownBy { mailSender.sendTest(MailMessage(listOf("admin@webbudget.com.br"), "mail-test", PT_BR.locale)) }
            .isInstanceOf(MailNotConfiguredException::class.java)
    }

    @Test
    fun `should raise the delivery failure with the reason for the test e-mail`() {

        val closedPort = ServerSocket(0).use { socket -> socket.localPort }
        mailSettingsService.update(server(port = closedPort), null)

        assertThatThrownBy { mailSender.sendTest(MailMessage(listOf("admin@webbudget.com.br"), "mail-test", PT_BR.locale)) }
            .isInstanceOf(MailDeliveryFailedException::class.java)
            .satisfies({ exception ->
                val reason = (exception as MailDeliveryFailedException).parameters!!["reason"] as String
                assertThat(reason).isNotBlank()
            })
    }

    @Test
    fun `should build the SMTP properties of each security`() {

        val none = MailSender.smtpPropertiesFor(server(security = MailSecurity.NONE))
        val startTls = MailSender.smtpPropertiesFor(server(security = MailSecurity.STARTTLS, username = "mailer"))
        val sslTls = MailSender.smtpPropertiesFor(server(security = MailSecurity.SSL_TLS))

        assertThat(none.getProperty("mail.smtp.auth")).isEqualTo("false")
        assertThat(none.getProperty("mail.smtp.starttls.enable")).isNull()
        assertThat(none.getProperty("mail.smtp.ssl.enable")).isNull()

        assertThat(startTls.getProperty("mail.smtp.auth")).isEqualTo("true")
        assertThat(startTls.getProperty("mail.smtp.starttls.enable")).isEqualTo("true")
        assertThat(startTls.getProperty("mail.smtp.starttls.required")).isEqualTo("true")
        assertThat(startTls.getProperty("mail.smtp.ssl.enable")).isNull()

        assertThat(sslTls.getProperty("mail.smtp.ssl.enable")).isEqualTo("true")
        assertThat(sslTls.getProperty("mail.smtp.starttls.enable")).isNull()

        listOf(none, startTls, sslTls).forEach { properties ->
            assertThat(properties.getProperty("mail.smtp.connectiontimeout")).isEqualTo("15000")
            assertThat(properties.getProperty("mail.smtp.timeout")).isEqualTo("15000")
            assertThat(properties.getProperty("mail.smtp.writetimeout")).isEqualTo("15000")
        }
    }

    @Test
    fun `should describe a delivery failure by the first messaging exception, the last message or the class`() {

        val nested = RuntimeException("outer", MessagingException("Could not connect to SMTP host", RuntimeException("socket")))
        val withoutMessaging = RuntimeException("outer", IllegalStateException("inner"))
        val withBlankCause = RuntimeException("outer", IllegalStateException(" "))
        val withoutMessage = IllegalStateException()

        assertThat(MailSender.describe(nested)).isEqualTo("Could not connect to SMTP host")
        assertThat(MailSender.describe(withoutMessaging)).isEqualTo("inner")
        assertThat(MailSender.describe(withBlankCause)).isEqualTo("outer")
        assertThat(MailSender.describe(withoutMessage)).isEqualTo("IllegalStateException")
    }
}
