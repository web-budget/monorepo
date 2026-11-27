package br.com.webbudget.server.domain.entities

import br.com.webbudget.server.domain.entities.registration.Compartment
import br.com.webbudget.server.domain.entities.registration.Compartment.Type
import br.com.webbudget.server.domain.entities.registration.Wallet
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate

class CompartmentTest {

    private val wallet = Wallet(name = "Wallet", type = Wallet.Type.PERSONAL)

    private val today = LocalDate.of(2026, 11, 26)

    private fun goal(balance: String, targetValue: String? = null, targetDate: LocalDate? = null) = Compartment(
        name = "Trip",
        type = Type.GOAL,
        wallet = wallet,
        balance = BigDecimal(balance),
        targetValue = targetValue?.let { BigDecimal(it) },
        targetDate = targetDate
    )

    @Test
    fun `should calculate the monthly amount counting the current month`() {

        val trip = goal("1050.00", "1800.00", LocalDate.of(2027, 2, 10))

        assertThat(trip.monthlyAmount(today)).isEqualByComparingTo("187.50")
        assertThat(trip.progress()).isEqualByComparingTo("0.5833")
        assertThat(trip.isAchieved()).isFalse()
        assertThat(trip.isOverdue(today)).isFalse()
    }

    @Test
    fun `should round the monthly amount up to the cent`() {

        val trip = goal("0.00", "100.00", LocalDate.of(2027, 1, 31))

        assertThat(trip.monthlyAmount(today)).isEqualByComparingTo("33.34")
    }

    @Test
    fun `should count only the current month when the target date is in it`() {

        val trip = goal("100.00", "400.00", LocalDate.of(2026, 11, 26))

        assertThat(trip.monthlyAmount(today)).isEqualByComparingTo("300.00")
    }

    @Test
    fun `should not have a monthly amount without target value or date, when achieved or overdue`() {

        assertThat(goal("10.00", null, LocalDate.of(2027, 2, 10)).monthlyAmount(today)).isNull()
        assertThat(goal("10.00", "100.00", null).monthlyAmount(today)).isNull()
        assertThat(goal("100.00", "100.00", LocalDate.of(2027, 2, 10)).monthlyAmount(today)).isNull()
        assertThat(goal("10.00", "100.00", LocalDate.of(2026, 10, 31)).monthlyAmount(today)).isNull()
    }

    @Test
    fun `should show the progress above one hundred percent and flag the achieved goal`() {

        val trip = goal("300.00", "200.00")

        assertThat(trip.progress()).isEqualByComparingTo("1.5")
        assertThat(trip.isAchieved()).isTrue()
    }

    @Test
    fun `should not round the progress up to the target`() {

        assertThat(goal("199.99", "200.00").progress()).isEqualByComparingTo("0.9999")
    }

    @Test
    fun `should not have progress without a positive target value`() {

        assertThat(goal("10.00").progress()).isNull()
        assertThat(goal("10.00", "0.00").progress()).isNull()
        assertThat(goal("10.00").isAchieved()).isFalse()
    }

    @Test
    fun `should flag the overdue goal only when the date passed and the target was not reached`() {

        assertThat(goal("10.00", "100.00", LocalDate.of(2026, 10, 31)).isOverdue(today)).isTrue()
        assertThat(goal("10.00", null, LocalDate.of(2026, 10, 31)).isOverdue(today)).isTrue()
        assertThat(goal("100.00", "100.00", LocalDate.of(2026, 10, 31)).isOverdue(today)).isFalse()
        assertThat(goal("10.00", "100.00", LocalDate.of(2026, 11, 26)).isOverdue(today)).isFalse()
        assertThat(goal("10.00", "100.00").isOverdue(today)).isFalse()
    }

    @Test
    fun `should detect goal fields and a changed target date`() {

        val reserve = Compartment(name = "Reserve", type = Type.RESERVE, wallet = wallet)

        assertThat(reserve.hasGoalFields()).isFalse()
        assertThat(reserve.hasTargetDateChanged()).isFalse()

        reserve.description = "Anything"
        reserve.targetDate = LocalDate.of(2027, 1, 1)

        assertThat(reserve.hasGoalFields()).isTrue()
        assertThat(reserve.hasTargetDateChanged()).isTrue()
    }
}
