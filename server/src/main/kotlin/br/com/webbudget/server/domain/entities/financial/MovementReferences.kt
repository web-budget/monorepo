package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class ClassificationReference(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val type: String,
    val active: Boolean,
    val budget: BigDecimal?
)

class CostCenterReference(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val fullName: String,
    val active: Boolean,
    val incomeBudget: BigDecimal?,
    val expenseBudget: BigDecimal?
)

class FinancialPeriodReference(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val startingAt: LocalDate,
    val endingAt: LocalDate,
    val status: Status
) {

    fun isOpen(): Boolean = status == Status.ACTIVE || status == Status.ENDED

    enum class Status { ACTIVE, ENDED, ACCOUNTED }
}
