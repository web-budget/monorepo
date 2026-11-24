package br.com.webbudget.server.domain.entities.financial

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.util.UUID

class InvoiceTest {

    @Test
    fun `should be due on the payment day of the month after the period when the day already passed`() {

        assertThat(invoice(LocalDate.of(2024, 12, 31), 10).paymentDueDate(LocalDate.of(2026, 1, 20))).isEqualTo(LocalDate.of(2025, 1, 10))
        assertThat(invoice(LocalDate.of(2024, 11, 30), 30).paymentDueDate(LocalDate.of(2026, 1, 20))).isEqualTo(LocalDate.of(2024, 12, 30))
    }

    @Test
    fun `should be due on the payment day of the same month when it comes after the end of the period`() {

        assertThat(invoice(LocalDate.of(2024, 1, 15), 20).paymentDueDate(LocalDate.of(2026, 1, 20))).isEqualTo(LocalDate.of(2024, 1, 20))
    }

    @Test
    fun `should be due on the last day of a short month`() {

        assertThat(invoice(LocalDate.of(2025, 1, 31), 30).paymentDueDate(LocalDate.of(2026, 1, 20))).isEqualTo(LocalDate.of(2025, 2, 28))
        assertThat(invoice(LocalDate.of(2024, 1, 31), 30).paymentDueDate(LocalDate.of(2026, 1, 20))).isEqualTo(LocalDate.of(2024, 2, 29))
        assertThat(invoice(LocalDate.of(2025, 2, 10), 30).paymentDueDate(LocalDate.of(2026, 1, 20))).isEqualTo(LocalDate.of(2025, 2, 28))
    }

    @Test
    fun `should be due on the day the invoice is closed when the card has no payment day`() {

        assertThat(invoice(LocalDate.of(2024, 1, 31), null).paymentDueDate(LocalDate.of(2026, 1, 20))).isEqualTo(LocalDate.of(2026, 1, 20))
    }

    private fun invoice(endingAt: LocalDate, paymentDay: Int?) = Invoice(
        card = CardReference(1, UUID.randomUUID(), "Card", "1234", true, paymentDay),
        financialPeriod = FinancialPeriodReference(
            1,
            UUID.randomUUID(),
            "Period",
            endingAt.withDayOfMonth(1),
            endingAt,
            FinancialPeriodReference.Status.OPEN
        )
    )
}
