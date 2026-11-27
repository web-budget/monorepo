package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.BAD_REQUEST
import java.time.LocalDate

internal const val ALL_PERIODS = "all"

private const val MIN_YEAR = 1900
private const val MAX_YEAR = 9999

internal fun parseDashboardYear(year: String?): Int? {

    if (year == null) {
        return LocalDate.now().year
    }

    if (year == ALL_PERIODS) {
        return null
    }

    val parsed = year.toIntOrNull()

    if (parsed == null || parsed !in MIN_YEAR..MAX_YEAR) {
        throw DomainException("The year must be $ALL_PERIODS or between $MIN_YEAR and $MAX_YEAR", BAD_REQUEST)
    }

    return parsed
}
