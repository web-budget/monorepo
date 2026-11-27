package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal
import java.util.UUID

class Composition(
    val years: List<Int>,
    val expenses: BigDecimal,
    val revenues: BigDecimal,
    val costCenters: List<CostCenterValue>,
    val classifications: List<ClassificationValue>,
    val seasonality: List<Seasonality>,
    val incomeSources: List<IncomeSource>
) {

    class CostCenterValue(
        val id: UUID,
        val name: String,
        val parent: UUID?,
        val value: BigDecimal
    )

    class ClassificationValue(
        val id: UUID,
        val name: String,
        val costCenter: UUID,
        val value: BigDecimal
    )

    class Seasonality(
        val id: UUID,
        val name: String,
        val months: List<BigDecimal?>
    )

    class IncomeSource(
        val id: UUID,
        val name: String,
        val value: BigDecimal
    )
}
