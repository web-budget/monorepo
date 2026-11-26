package br.com.webbudget.server.utilities.fixtures

import br.com.webbudget.server.domain.entities.registration.Card
import br.com.webbudget.server.domain.entities.registration.Classification
import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.entities.registration.Wallet
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

fun createWallet(
    id: Long? = null,
    externalId: UUID? = UUID.randomUUID(),
    name: String = "Wallet",
    type: Wallet.Type = Wallet.Type.BANK_ACCOUNT,
    currentBalance: BigDecimal = BigDecimal.ZERO,
    active: Boolean = true,
    description: String = "Some description",
    bank: String? = "Bank",
    agency: String? = "123",
    number: String? = "456789"
) = Wallet(name, type, currentBalance, active, description, bank, agency, number)
    .apply {
        this.id = id
        this.externalId = externalId
    }

fun createCostCenter(
    id: Long? = null,
    externalId: UUID? = UUID.randomUUID(),
    name: String = "Cost Center",
    fullName: String = name,
    active: Boolean = true,
    description: String = "Some description",
    expenseBudgetPercentage: BigDecimal? = BigDecimal.ONE,
    parentCostCenter: CostCenter? = null
) = CostCenter(name, fullName, active, description, expenseBudgetPercentage, parentCostCenter)
    .apply {
        this.id = id
        this.externalId = externalId
    }

fun createClassification(
    id: Long? = null,
    externalId: UUID? = UUID.randomUUID(),
    name: String = "Classification",
    type: Classification.Type = Classification.Type.INCOME,
    active: Boolean = true,
    description: String = "Some description"
) = Classification(name, type, active, description)
    .apply {
        this.id = id
        this.externalId = externalId
    }

fun createCard(
    id: Long? = null,
    externalId: UUID? = UUID.randomUUID(),
    name: String = "Card",
    lastFourDigits: String = "1234",
    invoicePaymentDay: Int = 1,
    active: Boolean = true,
    flag: String = "Flag",
    wallet: Wallet? = null
) = Card(name, lastFourDigits, invoicePaymentDay, active, flag, wallet)
    .apply {
        this.id = id
        this.externalId = externalId
    }

fun createFinancialPeriod(
    id: Long? = null,
    externalId: UUID? = UUID.randomUUID(),
    name: String = "Financial Period",
    startingAt: LocalDate = LocalDate.now(),
    endingAt: LocalDate = LocalDate.now().plusDays(15),
    status: FinancialPeriod.Status = FinancialPeriod.Status.OPEN,
    expensesGoal: BigDecimal = BigDecimal.ONE,
    revenuesGoal: BigDecimal = BigDecimal.TEN
) = FinancialPeriod(name, startingAt, endingAt, status, expensesGoal, revenuesGoal)
    .apply {
        this.id = id
        this.externalId = externalId
    }
