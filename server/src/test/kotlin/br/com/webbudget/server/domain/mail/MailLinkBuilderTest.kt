package br.com.webbudget.server.domain.mail

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class MailLinkBuilderTest {

    private val builder = MailLinkBuilder("https://webbudget.example.com")

    @Test
    fun `should build a link without parameters`() {
        assertThat(builder.build("/login")).isEqualTo("https://webbudget.example.com/login")
    }

    @Test
    fun `should not double the slash when the front end address ends with one`() {
        assertThat(MailLinkBuilder("https://webbudget.example.com/").build("/login"))
            .isEqualTo("https://webbudget.example.com/login")
    }

    @Test
    fun `should encode a plus sign and an at sign in a parameter value`() {

        val link = builder.build("/auth/account-activation", mapOf("token" to "abc-123", "email" to "maria+caderno@example.com"))

        assertThat(link).isEqualTo(
            "https://webbudget.example.com/auth/account-activation?token=abc-123&email=maria%2Bcaderno%40example.com"
        )
    }

    @Test
    fun `should encode characters that would end or split the query`() {

        val link = builder.build("/configuration/users", mapOf("filter" to "a&b=c d#e"))

        assertThat(link).isEqualTo("https://webbudget.example.com/configuration/users?filter=a%26b%3Dc%20d%23e")
    }
}
