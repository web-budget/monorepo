package br.com.webbudget.server.domain.entities.registration

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.temporal.ChronoUnit

class Compartment(
    var name: String,
    val type: Type,
    val wallet: Wallet,
    var balance: BigDecimal = BigDecimal.ZERO,
    var description: String? = null,
    var targetValue: BigDecimal? = null,
    var targetDate: LocalDate? = null,
    var statementEntryCount: Int = 0
) : PersistentEntity() {

    val storedTargetDate: LocalDate? = targetDate

    fun hasGoalFields(): Boolean = description != null || targetValue != null || targetDate != null

    fun hasTargetDateChanged(): Boolean = targetDate != storedTargetDate

    fun progress(): BigDecimal? = targetValue?.takeIf { it.signum() > 0 }
        ?.let { target -> balance.divide(target, PROGRESS_SCALE, RoundingMode.DOWN) }

    fun isAchieved(): Boolean = targetValue?.let { balance >= it } ?: false

    fun isOverdue(today: LocalDate): Boolean = type == Type.GOAL && targetDate?.isBefore(today) == true && !isAchieved()

    fun monthlyAmount(today: LocalDate): BigDecimal? {

        val target = targetValue ?: return null
        val date = targetDate ?: return null

        if (isAchieved() || date.isBefore(today)) {
            return null
        }

        val remainingMonths = ChronoUnit.MONTHS.between(today.withDayOfMonth(1), date.withDayOfMonth(1)) + 1

        return target.subtract(balance).divide(BigDecimal(remainingMonths), MONEY_SCALE, RoundingMode.CEILING)
    }

    enum class Type {
        RESERVE, INVESTMENT, GOAL
    }

    companion object {

        private const val PROGRESS_SCALE = 4
        private const val MONEY_SCALE = 2
    }
}
