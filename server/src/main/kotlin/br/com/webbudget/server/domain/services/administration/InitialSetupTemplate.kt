package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.registration.Classification
import java.math.BigDecimal

object InitialSetupTemplate {

    data class CostCenterItem(
        val name: String,
        val expenseBudgetPercentage: BigDecimal?,
        val children: List<String> = emptyList()
    )

    data class ClassificationItem(
        val name: String,
        val type: Classification.Type
    )

    val costCenters = listOf(
        CostCenterItem(
            "Essenciais",
            BigDecimal(50),
            listOf("Moradia", "Alimentação", "Transporte", "Saúde", "Educação")
        ),
        CostCenterItem("Estilo de vida", BigDecimal(30), listOf("Lazer", "Pessoal")),
        CostCenterItem("Futuro", BigDecimal(20), listOf("Reserva", "Investimento", "Dívidas")),
        CostCenterItem("Renda", null)
    )

    private val expenseClassifications = listOf(
        "Aluguel ou prestação", "Condomínio", "Energia", "Água", "Gás", "Internet e telefone",
        "Manutenção da casa", "Móveis e eletrodomésticos",
        "Mercado", "Refeições fora", "Delivery",
        "Combustível ou recarga", "Transporte público e apps", "Manutenção do veículo",
        "Estacionamento e pedágio", "Seguro do veículo",
        "Plano de saúde", "Consultas e exames", "Farmácia", "Academia e esportes",
        "Mensalidade escolar", "Cursos e livros",
        "Passeios e eventos", "Viagens", "Streaming e assinaturas",
        "Vestuário", "Cuidados pessoais", "Presentes e doações", "Pets",
        "Impostos e taxas", "Tarifas bancárias e juros", "Parcela de dívida",
        "Outras despesas"
    )

    private val incomeClassifications = listOf(
        "Salário", "13º e férias", "Renda extra e serviços", "Rendimentos", "Reembolsos", "Restituições",
        "Venda de bens", "Outras receitas"
    )

    val classifications: List<ClassificationItem> =
        expenseClassifications.map { ClassificationItem(it, Classification.Type.EXPENSE) } +
            incomeClassifications.map { ClassificationItem(it, Classification.Type.INCOME) }
}
