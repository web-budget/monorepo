package br.com.webbudget.server.infrastructure.repository

import br.com.webbudget.server.BaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

class FinancialSchemaTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should leave no table of the previous financial model behind`() {

        val tables = dsl.fetch(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'financial'"
        ).map { it.get(0, String::class.java) }

        assertThat(tables).doesNotContain(
            "period_movements",
            "recurring_movements",
            "transferences",
            "wallet_balances",
            "credit_card_invoices"
        )
    }

    @Test
    fun `should have replaced the payments table by the one of the new model`() {

        val columns = dsl.fetch(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'financial' AND table_name = 'payments'"
        ).map { it.get(0, String::class.java) }

        assertThat(columns).contains("id_movement", "value_paid", "paid_on").doesNotContain("paid_at", "id_card")
    }

    @Test
    fun `should keep only the open and closed statuses on financial periods`() {

        val definition = dsl.fetchValue(
            "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'ck_financial_periods_on_status'"
        ) as String

        assertThat(definition).contains("OPEN").contains("CLOSED").doesNotContain("ACCOUNTED")
    }
}
