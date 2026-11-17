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

    val ACTIVE_PERIOD_ID: UUID = UUID.fromString("2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a")
    val ACCOUNTED_PERIOD_ID: UUID = UUID.fromString("6531c609-577b-4a45-82a9-debe0b53eeab")
    val ENDED_PERIOD_ID: UUID = UUID.fromString("6248abb7-a8ad-4d2b-a0a4-0417b98cb008")

    val EXPENSE_CLASSIFICATION_ID: UUID = UUID.fromString("503cee43-583e-4df5-a9db-8bf049cf6a8d")
    val INCOME_CLASSIFICATION_ID: UUID = UUID.fromString("fd17c780-50b0-4669-9c1c-272c6f5d3413")

    val HEALTH_COST_CENTER_ID: UUID = UUID.fromString("338c8eea-6d53-4e68-882d-cec57c0ac49f")
    val HOME_COST_CENTER_ID: UUID = UUID.fromString("bfe5413f-1cc6-46cb-967c-8a3b11046747")

    val OPEN_PERIOD_MOVEMENT_ID: UUID = UUID.fromString("4a26f975-c9a9-4231-958c-9b59ee55e04f")
    val ACCOUNTED_PERIOD_MOVEMENT_ID: UUID = UUID.fromString("655a0c7f-caf4-4213-be64-e28c5646e979")
    val PAID_PERIOD_MOVEMENT_ID: UUID = UUID.fromString("c237997e-c784-429d-9d22-a9f5cc079822")

    val ACTIVE_RECURRING_MOVEMENT_ID: UUID = UUID.fromString("e12805f3-1419-4a7b-994b-4c751255fc7a")
    val ENDED_RECURRING_MOVEMENT_ID: UUID = UUID.fromString("08d874d2-f56d-49b9-a6b3-bf86e075d986")
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
