package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.ClassificationReference
import br.com.webbudget.server.domain.entities.financial.CostCenterReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.jooq.financial.tables.records.PeriodMovementsRecord
import br.com.webbudget.server.jooq.financial.tables.records.RecurringMovementsRecord
import br.com.webbudget.server.jooq.registration.tables.records.ClassificationsRecord
import br.com.webbudget.server.jooq.registration.tables.records.CostCentersRecord
import br.com.webbudget.server.jooq.registration.tables.records.FinancialPeriodsRecord

internal fun ClassificationsRecord.toClassificationReference(): ClassificationReference = ClassificationReference(
    id = id!!,
    externalId = externalId!!,
    name = name!!,
    type = type!!,
    active = active!!,
    budget = budget
)

internal fun CostCentersRecord.toCostCenterReference(): CostCenterReference = CostCenterReference(
    id = id!!,
    externalId = externalId!!,
    name = name!!,
    fullName = fullName ?: name!!,
    active = active!!,
    incomeBudget = incomeBudget,
    expenseBudget = expenseBudget
)

internal fun FinancialPeriodsRecord.toFinancialPeriodReference(): FinancialPeriodReference = FinancialPeriodReference(
    id = id!!,
    externalId = externalId!!,
    name = name!!,
    startingAt = startingAt!!,
    endingAt = endingAt!!,
    status = FinancialPeriodReference.Status.valueOf(status!!)
)

internal fun PeriodMovementsRecord.toPeriodMovement(
    classification: ClassificationReference,
    costCenter: CostCenterReference,
    financialPeriod: FinancialPeriodReference
): PeriodMovement = PeriodMovement(
    name = name!!,
    dueDate = dueDate!!,
    value = value!!,
    classification = classification,
    costCenter = costCenter,
    financialPeriod = financialPeriod,
    state = PeriodMovement.State.valueOf(state!!),
    quoteNumber = quoteNumber,
    description = description
).also { movement -> movement.restore(id, externalId, version, createdOn, lastUpdate) }

internal fun RecurringMovementsRecord.toRecurringMovement(
    classification: ClassificationReference,
    costCenter: CostCenterReference
): RecurringMovement = RecurringMovement(
    name = name!!,
    value = value!!,
    startingAt = startingAt!!,
    classification = classification,
    costCenter = costCenter,
    state = RecurringMovement.State.valueOf(state!!),
    autoLaunch = autoLaunch!!,
    indeterminate = indeterminate!!,
    totalQuotes = totalQuotes,
    startingQuote = startingQuote,
    currentQuote = currentQuote,
    description = description
).also { movement -> movement.restore(id, externalId, version, createdOn, lastUpdate) }
