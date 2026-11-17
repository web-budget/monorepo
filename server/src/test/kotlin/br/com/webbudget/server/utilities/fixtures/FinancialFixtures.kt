package br.com.webbudget.server.utilities.fixtures

import br.com.webbudget.server.domain.entities.financial.ClassificationReference
import br.com.webbudget.server.domain.entities.financial.CostCenterReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

object FinancialTestData {

    val ACTIVE_PERIOD_ID: UUID = UUID.fromString("bc67ba91-7c0a-466d-877c-0b1fe2fb56bd")
    val ACCOUNTED_PERIOD_ID: UUID = UUID.fromString("df05156c-3fce-4f56-88ff-918d50200312")
    val ENDED_PERIOD_ID: UUID = UUID.fromString("27881a12-5e61-43cd-a6d0-fdb32eaa75c0")

    val EXPENSE_CLASSIFICATION_ID: UUID = UUID.fromString("ff8ac873-2cbd-43dd-a3e8-2bc451f4e3fa")
    val INCOME_CLASSIFICATION_ID: UUID = UUID.fromString("f21d94d2-d28e-4aa3-b12d-8a520023edd9")

    val HEALTH_COST_CENTER_ID: UUID = UUID.fromString("2bed30e7-419d-4097-841c-7d88fbc708ad")
    val HOME_COST_CENTER_ID: UUID = UUID.fromString("52e3456b-1b0d-42c5-8be0-07ddaecce441")

    val OPEN_PERIOD_MOVEMENT_ID: UUID = UUID.fromString("287e26fa-763b-4efb-908e-734e637bb6fd")
    val ACCOUNTED_PERIOD_MOVEMENT_ID: UUID = UUID.fromString("413b96ec-fed9-487f-b587-7bb9c4989020")
    val PAID_PERIOD_MOVEMENT_ID: UUID = UUID.fromString("5d1d1e86-5f4e-4bd5-93df-3b0f5fd6b8d4")

    val ACTIVE_RECURRING_MOVEMENT_ID: UUID = UUID.fromString("ba870b58-01aa-4477-8ea1-1c644a6770c4")
    val ENDED_RECURRING_MOVEMENT_ID: UUID = UUID.fromString("2afc2759-b38e-4e1a-9a56-3f54c11c7e5c")
}

fun createPeriodMovement(
    name: String = "The movement",
    dueDate: LocalDate = LocalDate.of(2024, 12, 15),
    value: BigDecimal = BigDecimal("10.99"),
    classification: ClassificationReference,
    costCenter: CostCenterReference,
    financialPeriod: FinancialPeriodReference,
    state: PeriodMovement.State = PeriodMovement.State.OPEN,
    quoteNumber: Int? = null,
    description: String? = null
) = PeriodMovement(
    name = name,
    dueDate = dueDate,
    value = value,
    classification = classification,
    costCenter = costCenter,
    financialPeriod = financialPeriod,
    state = state,
    quoteNumber = quoteNumber,
    description = description
)

fun createRecurringMovement(
    name: String = "The movement",
    value: BigDecimal = BigDecimal("10.99"),
    startingAt: LocalDate = LocalDate.of(2024, 1, 2),
    classification: ClassificationReference,
    costCenter: CostCenterReference,
    state: RecurringMovement.State = RecurringMovement.State.ACTIVE,
    autoLaunch: Boolean = true,
    indeterminate: Boolean = true,
    totalQuotes: Int? = null,
    startingQuote: Int? = null,
    currentQuote: Int? = null,
    description: String? = null
) = RecurringMovement(
    name = name,
    value = value,
    startingAt = startingAt,
    classification = classification,
    costCenter = costCenter,
    state = state,
    autoLaunch = autoLaunch,
    indeterminate = indeterminate,
    totalQuotes = totalQuotes,
    startingQuote = startingQuote,
    currentQuote = currentQuote,
    description = description
)
