package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.Language.EN_US
import br.com.webbudget.server.domain.entities.administration.Language.PT_BR
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Component
class MailDateFormatter(
    @param:Value($$"${web-budget.mail.time-zone}")
    timeZone: String
) {

    private val mailZone = ZoneId.of(timeZone)

    fun format(dateTime: LocalDateTime, language: Language, serverZone: ZoneId = ZoneId.systemDefault()): String =
        DateTimeFormatter.ofPattern(PATTERNS.getValue(language), language.locale)
            .format(dateTime.atZone(serverZone).withZoneSameInstant(mailZone))

    companion object {
        private val PATTERNS = mapOf(
            PT_BR to "dd/MM/yyyy 'às' HH:mm",
            EN_US to "MMM d, yyyy, h:mm a"
        )
    }
}
