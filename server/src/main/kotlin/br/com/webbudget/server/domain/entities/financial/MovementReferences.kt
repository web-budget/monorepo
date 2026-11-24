package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class ClassificationReference(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val type: String,
    val active: Boolean
)

class CostCenterReference(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val fullName: String,
    val active: Boolean
)

class FinancialPeriodReference(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val startingAt: LocalDate,
    val endingAt: LocalDate,
    val status: Status
) {

    fun isOpen(): Boolean = status == Status.OPEN

    fun isExpired(today: LocalDate): Boolean = isOpen() && endingAt.isBefore(today)

    enum class Status { OPEN, CLOSED }
}

class WalletReference(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val active: Boolean,
    val currentBalance: BigDecimal
)

class RecurringMovementReference(
    val externalId: UUID,
    val name: String,
    val card: CardReference?
)
