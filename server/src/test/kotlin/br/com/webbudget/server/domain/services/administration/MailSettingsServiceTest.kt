package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.MailSecurity
import br.com.webbudget.server.domain.entities.administration.MailSettings
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD

@Sql("/sql/administration/clear-tables.sql")
@Sql("/sql/administration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class MailSettingsServiceTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var mailSettingsService: MailSettingsService

    @Test
    fun `should trim the texts and treat the empty optional ones as missing`() {

        val saved = mailSettingsService.update(
            MailSettings(
                host = "  smtp.example.com  ",
                port = 25,
                security = MailSecurity.NONE,
                username = "   ",
                fromAddress = " no-reply@example.com ",
                fromName = "",
                replyToAddress = "  "
            ),
            null
        )

        assertThat(saved.host).isEqualTo("smtp.example.com")
        assertThat(saved.security).isEqualTo(MailSecurity.NONE)
        assertThat(saved.username).isNull()
        assertThat(saved.fromAddress).isEqualTo("no-reply@example.com")
        assertThat(saved.fromName).isNull()
        assertThat(saved.replyToAddress).isNull()
        assertThat(saved.hasPassword()).isFalse()
        assertThat(saved.isConfigured()).isTrue()
    }

    @Test
    fun `should keep the saved settings out of the string of the entity`() {

        val saved = mailSettingsService.update(
            MailSettings(host = "smtp.example.com", port = 25, username = "mailer", fromAddress = "a@example.com"),
            "plain-password"
        )

        assertThat(saved.hasPassword()).isTrue()
        assertThat(saved.toString()).doesNotContain("plain-password").doesNotContain(saved.passwordCiphertext!!)
    }
}
