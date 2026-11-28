package br.com.webbudget.server.domain.entities.administration

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class MailSettingsTest {

    @Test
    fun `should be configured only with host, port and sender address`() {

        assertThat(MailSettings().isConfigured()).isFalse()
        assertThat(MailSettings(port = 25, fromAddress = "a@example.com").isConfigured()).isFalse()
        assertThat(MailSettings(host = "smtp", fromAddress = "a@example.com").isConfigured()).isFalse()
        assertThat(MailSettings(host = "smtp", port = 25).isConfigured()).isFalse()
        assertThat(MailSettings(host = "smtp", port = 25, fromAddress = "a@example.com").isConfigured()).isTrue()
    }

    @Test
    fun `should have a password only with a ciphertext`() {

        assertThat(MailSettings().hasPassword()).isFalse()
        assertThat(MailSettings(passwordCiphertext = "cipher").hasPassword()).isTrue()
    }
}
