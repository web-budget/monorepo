package br.com.webbudget.server.infrastructure.repository.registration

import br.com.webbudget.server.domain.entities.registration.Card
import br.com.webbudget.server.domain.entities.registration.Classification
import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.jooq.registration.tables.records.CardsRecord
import br.com.webbudget.server.jooq.registration.tables.records.ClassificationsRecord
import br.com.webbudget.server.jooq.registration.tables.records.CostCentersRecord
import br.com.webbudget.server.jooq.registration.tables.records.FinancialPeriodsRecord
import br.com.webbudget.server.jooq.registration.tables.records.WalletsRecord

internal fun WalletsRecord.toWallet(): Wallet = Wallet(
    name = name!!,
    type = Wallet.Type.valueOf(type!!),
    currentBalance = currentBalance!!,
    active = active!!,
    description = description,
    bank = bank,
    agency = agency,
    number = number
).also { wallet -> wallet.restore(id, externalId, version, createdOn, lastUpdate) }

internal fun CardsRecord.toCard(wallet: Wallet? = null): Card = Card(
    name = name!!,
    lastFourDigits = lastFourDigits!!,
    type = Card.Type.valueOf(type!!),
    active = active!!,
    invoicePaymentDay = invoicePaymentDay,
    flag = flag,
    wallet = wallet
).also { card -> card.restore(id, externalId, version, createdOn, lastUpdate) }

internal fun ClassificationsRecord.toClassification(): Classification = Classification(
    name = name!!,
    type = Classification.Type.valueOf(type!!),
    active = active!!,
    description = description
).also { classification -> classification.restore(id, externalId, version, createdOn, lastUpdate) }

internal fun CostCentersRecord.toCostCenter(parent: CostCenter? = null): CostCenter = CostCenter(
    name = name!!,
    fullName = fullName ?: name!!,
    active = active!!,
    description = description,
    incomeBudget = incomeBudget,
    expenseBudget = expenseBudget,
    parent = parent
).also { costCenter -> costCenter.restore(id, externalId, version, createdOn, lastUpdate) }

internal fun FinancialPeriodsRecord.toFinancialPeriod(): FinancialPeriod = FinancialPeriod(
    name = name!!,
    startingAt = startingAt!!,
    endingAt = endingAt!!,
    status = FinancialPeriod.Status.valueOf(status!!),
    expensesGoal = expensesGoal,
    revenuesGoal = revenuesGoal
).also { financialPeriod -> financialPeriod.restore(id, externalId, version, createdOn, lastUpdate) }
