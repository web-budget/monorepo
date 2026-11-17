package br.com.webbudget.server.application.payloads.financial

import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

data class MovementClassificationView(
    val id: UUID,
    val name: String,
    val type: String,
    val active: Boolean,
    val budget: BigDecimal? = null
)

data class MovementCostCenterView(
    val id: UUID,
    val name: String,
    val fullName: String,
    val active: Boolean,
    val incomeBudget: BigDecimal? = null,
    val expenseBudget: BigDecimal? = null
)

data class MovementFinancialPeriodView(
    val id: UUID,
    val name: String,
    val startingAt: LocalDate,
    val endingAt: LocalDate,
    val status: String
)
