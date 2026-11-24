package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.CardReference
import br.com.webbudget.server.domain.entities.financial.ClassificationReference
import br.com.webbudget.server.domain.entities.financial.CostCenterReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.domain.entities.financial.RecurringMovementReference
import br.com.webbudget.server.domain.entities.financial.WalletReference
import br.com.webbudget.server.jooq.financial.tables.records.MovementsRecord
import br.com.webbudget.server.jooq.financial.tables.records.PaymentsRecord
import br.com.webbudget.server.jooq.registration.tables.records.CardsRecord
import br.com.webbudget.server.jooq.registration.tables.records.ClassificationsRecord
import br.com.webbudget.server.jooq.registration.tables.records.CostCentersRecord
import br.com.webbudget.server.jooq.registration.tables.records.FinancialPeriodsRecord
import br.com.webbudget.server.jooq.registration.tables.records.WalletsRecord

internal fun ClassificationsRecord.toClassificationReference(): ClassificationReference = ClassificationReference(
    id = id!!,
    externalId = externalId!!,
    name = name!!,
    type = type!!,
    active = active!!
)

internal fun CostCentersRecord.toCostCenterReference(): CostCenterReference = CostCenterReference(
    id = id!!,
    externalId = externalId!!,
    name = name!!,
    fullName = fullName ?: name!!,
    active = active!!
)

internal fun FinancialPeriodsRecord.toFinancialPeriodReference(): FinancialPeriodReference =
    FinancialPeriodReference(
        id = id!!,
        externalId = externalId!!,
        name = name!!,
        startingAt = startingAt!!,
        endingAt = endingAt!!,
        status = FinancialPeriodReference.Status.valueOf(status!!)
    )

internal fun CardsRecord.toCardReference(): CardReference = CardReference(
    id = id!!,
    externalId = externalId!!,
    name = name!!,
    lastFourDigits = lastFourDigits!!,
    active = active!!,
    invoicePaymentDay = invoicePaymentDay!!
)

internal fun WalletsRecord.toWalletReference(): WalletReference = WalletReference(
    id = id!!,
    externalId = externalId!!,
    name = name!!,
    active = active!!,
    currentBalance = currentBalance!!
)

internal fun PaymentsRecord.toPayment(wallet: WalletReference?, card: CardReference?): Payment = Payment(
    wallet = wallet,
    paidOn = paidOn!!,
    discount = discount!!,
    value = value!!,
    card = card
).also { payment -> payment.restore(id, externalId, version, createdOn, lastUpdate) }

internal fun MovementsRecord.toMovement(
    classification: ClassificationReference?,
    costCenter: CostCenterReference?,
    financialPeriod: FinancialPeriodReference,
    payment: Payment?,
    invoice: Invoice?,
    recurringMovement: RecurringMovementReference?
): Movement = Movement(
    name = name!!,
    type = Movement.Type.valueOf(type!!),
    value = value!!,
    dueDate = dueDate!!,
    classification = classification,
    costCenter = costCenter,
    financialPeriod = financialPeriod,
    status = Movement.Status.valueOf(status!!),
    description = description,
    payment = payment,
    invoice = invoice,
    recurringMovement = recurringMovement
).also { movement -> movement.restore(id, externalId, version, createdOn, lastUpdate) }
