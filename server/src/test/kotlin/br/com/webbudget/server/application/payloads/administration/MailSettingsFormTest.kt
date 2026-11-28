package br.com.webbudget.server.application.payloads.administration

import br.com.webbudget.server.domain.entities.administration.MailSecurity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class MailSettingsFormTest {

    @Test
    fun `should mask the password in the string of the form`() {

        val form = MailSettingsForm(
            host = "smtp.example.com",
            port = 587,
            security = MailSecurity.STARTTLS,
            username = "mailer",
            password = "plain-password",
            fromAddress = "a@example.com",
            fromName = null,
            replyToAddress = null
        )

        assertThat(form.toString()).contains("host=smtp.example.com").doesNotContain("plain-password")
    }
}
