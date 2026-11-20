package br.com.webbudget.server.domain.mail

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.Properties

class MailMessagesTest {

    private fun load(name: String): Properties = Properties().apply {
        MailMessagesTest::class.java.getResourceAsStream("/mail/$name")!!.reader(Charsets.UTF_8).use { load(it) }
    }

    @Test
    fun `should give both languages the same keys`() {
        assertThat(load("messages_en_US.properties").keys).containsExactlyInAnyOrderElementsOf(load("messages.properties").keys)
    }

    @Test
    fun `should keep the default messages equal to the Brazilian Portuguese ones`() {
        assertThat(load("messages.properties")).isEqualTo(load("messages_pt_BR.properties"))
    }

    @Test
    fun `should ask each e-mail for a subject, a preheader and a footer in every language`() {

        val templates = listOf(
            "account-approved",
            "account-blocked",
            "account-unblocked",
            "password-changed",
            "totp-reset",
            "google-linked",
            "account-activation.self-registration",
            "account-activation.administrator-created",
            "recover-password",
            "user-pending-approval"
        )

        listOf("messages.properties", "messages_en_US.properties").map { load(it) }.forEach { messages ->
            templates.forEach { template ->
                assertThat(messages.stringPropertyNames()).contains("$template.subject", "$template.preheader", "$template.footer")
            }
        }
    }

    @Test
    fun `should not use a straight apostrophe, which the message format would swallow`() {
        listOf("messages.properties", "messages_en_US.properties").map { load(it) }.forEach { messages ->
            assertThat(messages.values.map { it.toString() }).noneMatch { it.contains("'") }
        }
    }
}
