package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.entities.administration.Language.EN_US
import br.com.webbudget.server.domain.entities.administration.Language.PT_BR
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Locale

class MailDateFormatterTest {

    private val formatter = MailDateFormatter("America/Sao_Paulo")

    private val serverTime = LocalDateTime.of(2026, 11, 20, 17, 32)

    @Test
    fun `should write the date in Portuguese converted from the server zone to the mail zone`() {
        assertThat(formatter.format(serverTime, PT_BR, ZoneId.of("UTC"))).isEqualTo("20/11/2026 às 14:32")
    }

    @Test
    fun `should write the date in English converted from the server zone to the mail zone`() {
        assertThat(formatter.format(serverTime, EN_US, ZoneId.of("UTC"))).isEqualTo("Nov 20, 2026, 2:32 PM")
    }

    @Test
    fun `should cross midnight when the zones are on different days`() {
        assertThat(formatter.format(LocalDateTime.of(2026, 11, 21, 1, 5), PT_BR, ZoneId.of("UTC")))
            .isEqualTo("20/11/2026 às 22:05")
    }

    @Test
    fun `should read the server zone from the system when none is given`() {
        assertThat(formatter.format(serverTime, PT_BR)).matches("\\d{2}/\\d{2}/\\d{4} às \\d{2}:\\d{2}")
    }

    @Test
    fun `should turn each language into its locale`() {
        assertThat(PT_BR.locale).isEqualTo(Locale.forLanguageTag("pt-BR"))
        assertThat(EN_US.locale).isEqualTo(Locale.forLanguageTag("en-US"))
    }
}
