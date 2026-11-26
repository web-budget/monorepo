package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.registration.Classification
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class InitialSetupTemplateTest {

    @Test
    fun `should have 14 cost centers with the 50, 30 and 20 budgets on the roots only`() {

        val items = InitialSetupTemplate.costCenters

        assertThat(items.map { it.name }).containsExactly("Essenciais", "Estilo de vida", "Futuro", "Renda")
        assertThat(items.sumOf { 1 + it.children.size }).isEqualTo(14)
        assertThat(items.map { it.expenseBudgetPercentage?.toInt() }).containsExactly(50, 30, 20, null)
        assertThat(items.first { it.name == "Renda" }.children).isEmpty()
    }

    @Test
    fun `should have 41 classifications, 33 of expense and 8 of income, with unique names`() {

        val items = InitialSetupTemplate.classifications

        assertThat(items).hasSize(41)
        assertThat(items.count { it.type == Classification.Type.EXPENSE }).isEqualTo(33)
        assertThat(items.count { it.type == Classification.Type.INCOME }).isEqualTo(8)
        assertThat(items.map { it.name.lowercase() }).doesNotHaveDuplicates()
        assertThat(items.map { it.name }).contains("Seguro do veículo").doesNotContain("Seguro")
    }
}
