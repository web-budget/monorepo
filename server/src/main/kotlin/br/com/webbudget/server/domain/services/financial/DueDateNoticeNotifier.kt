package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.Language.PT_BR
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.financial.DueMovement
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.mail.MailLinkBuilder
import br.com.webbudget.server.domain.mail.MailMessage
import br.com.webbudget.server.domain.mail.MailMessageRequested
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Component
class DueDateNoticeNotifier(
    private val mailLinkBuilder: MailLinkBuilder,
    private val applicationEventPublisher: ApplicationEventPublisher
) {

    fun notifyDaily(user: User, movements: List<DueMovement>) {
        publish(
            user = user,
            templateName = "due-date-daily",
            movements = movements,
            subjectArgs = listOf(movements.size),
            variables = emptyMap()
        )
    }

    fun notifyWeekly(user: User, movements: List<DueMovement>, from: LocalDate, to: LocalDate) {

        val language = user.defaultLanguage

        publish(
            user = user,
            templateName = "due-date-weekly",
            movements = movements,
            subjectArgs = listOf(movements.size),
            variables = mapOf("from" to formatLongDate(from, language), "to" to formatLongDate(to, language))
        )
    }

    private fun publish(
        user: User,
        templateName: String,
        movements: List<DueMovement>,
        subjectArgs: List<Any>,
        variables: Map<String, Any?>
    ) {

        val language = user.defaultLanguage

        val lines = movements.map { movement ->
            DueLine(
                label = "${formatShortDate(movement.dueDate, language)}  ${movement.name}",
                value = formatValue(movement, language),
                tone = if (movement.type == Movement.Type.INCOME) "income" else "expense"
            )
        }

        applicationEventPublisher.publishEvent(
            MailMessageRequested(
                MailMessage(
                    to = listOf(user.email),
                    templateName = templateName,
                    locale = language.locale,
                    variables = variables + mapOf(
                        "userName" to user.name,
                        "lines" to lines,
                        "movementsUrl" to mailLinkBuilder.build("/financeiro/movimentos")
                    ),
                    subjectArgs = subjectArgs
                )
            )
        )
    }

    private fun formatShortDate(date: LocalDate, language: Language): String =
        DateTimeFormatter.ofPattern(if (language == PT_BR) "dd/MM" else "MMM d", language.locale).format(date)

    private fun formatLongDate(date: LocalDate, language: Language): String =
        DateTimeFormatter.ofPattern(if (language == PT_BR) "dd/MM/yyyy" else "MMM d, yyyy", language.locale).format(date)

    private fun formatValue(movement: DueMovement, language: Language): String {

        val number = NumberFormat.getNumberInstance(language.locale).apply {
            minimumFractionDigits = 2
            maximumFractionDigits = 2
        }

        return "R$ ${number.format(movement.value.abs().setScale(2, java.math.RoundingMode.HALF_UP))}"
    }

    class DueLine(
        val label: String,
        val value: String,
        val tone: String
    )
}
