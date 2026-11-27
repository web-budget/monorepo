package br.com.webbudget.server.application.payloads.financial

import com.fasterxml.jackson.annotation.JsonInclude
import java.math.BigDecimal
import java.util.UUID

data class CompositionCostCenterView(
    val id: UUID,
    val name: String,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val parent: UUID?,
    val value: BigDecimal
)

data class CompositionClassificationView(
    val id: UUID,
    val name: String,
    val costCenter: UUID,
    val value: BigDecimal
)

data class CompositionSeasonalityView(
    val id: UUID,
    val name: String,
    @field:JsonInclude(JsonInclude.Include.ALWAYS)
    val months: List<BigDecimal?>
)

data class CompositionIncomeSourceView(
    val id: UUID,
    val name: String,
    val value: BigDecimal
)

data class CompositionView(
    val cut: String,
    val years: List<Int>,
    val expenses: BigDecimal,
    val revenues: BigDecimal,
    val costCenters: List<CompositionCostCenterView>,
    val classifications: List<CompositionClassificationView>,
    val seasonality: List<CompositionSeasonalityView>,
    val incomeSources: List<CompositionIncomeSourceView>
)
