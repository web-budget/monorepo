package br.com.webbudget.server.domain.entities.registration

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.LocalDate

class RegistrationEntitiesTest {

    @Test
    fun `should build the full name from the full name of the parent`() {

        val root = CostCenter("Car", "Car")
        val child = CostCenter("Taxes", "Taxes", parent = root)
        val grandchild = CostCenter("Insurance", "Insurance", parent = child)

        child.updateFullName()
        grandchild.updateFullName()
        root.updateFullName()

        assertThat(root.fullName).isEqualTo("Car")
        assertThat(child.fullName).isEqualTo("Car > Taxes")
        assertThat(grandchild.fullName).isEqualTo("Car > Taxes > Insurance")
    }

    @Test
    fun `should consider only the open status as open`() {

        fun period(status: FinancialPeriod.Status) =
            FinancialPeriod("Period", LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31), status)

        assertThat(period(FinancialPeriod.Status.OPEN).isOpen()).isTrue()
        assertThat(period(FinancialPeriod.Status.CLOSED).isOpen()).isFalse()
    }

    @Test
    fun `should expire only an open period whose end date has passed`() {

        fun period(status: FinancialPeriod.Status) =
            FinancialPeriod("Period", LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31), status)

        assertThat(period(FinancialPeriod.Status.OPEN).isExpired(LocalDate.of(2024, 1, 31))).isFalse()
        assertThat(period(FinancialPeriod.Status.OPEN).isExpired(LocalDate.of(2024, 2, 1))).isTrue()
        assertThat(period(FinancialPeriod.Status.CLOSED).isExpired(LocalDate.of(2024, 2, 1))).isFalse()
    }
}
