package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

class RecurringMovement(
    var name: String,
    val type: Movement.Type,
    val valueKind: ValueKind,
    var value: BigDecimal,
    var installments: Int?,
    val firstInstallment: Int,
    var autoLaunch: Boolean,
    var active: Boolean,
    var classification: ClassificationReference,
    var costCenter: CostCenterReference,
    var card: CardReference?,
    val launchedInstallments: Int? = null,
    val lastPaidValue: BigDecimal? = null,
    val launchedInPeriod: UUID? = null
) : PersistentEntity() {

    val finished: Boolean
        get() = installments != null && (launchedInstallments ?: 0) >= installments!!

    val ended: Boolean
        get() = !active || finished

    val nextInstallment: Int?
        get() = if (finished) null else (launchedInstallments ?: (firstInstallment - 1)) + 1

    val launchValue: BigDecimal
        get() = if (valueKind == ValueKind.VARIABLE) lastPaidValue ?: value else value

    fun movementName(installment: Int): String {

        val total = installments ?: return name

        val suffix = " $installment/$total"

        return name.take(MAX_NAME_LENGTH - suffix.length) + suffix
    }

    enum class ValueKind { FIXED, VARIABLE }

    companion object {
        const val MAX_NAME_LENGTH = 150
    }
}

class RecurringValue(
    val value: BigDecimal,
    val reason: String?,
    val validFrom: LocalDateTime,
    val validFromPeriod: FinancialPeriodReference? = null,
    val current: Boolean = false
)

class RecurringLaunchEntry(
    val financialPeriod: FinancialPeriodReference,
    val installment: Int,
    val movementId: UUID,
    val value: BigDecimal,
    val status: Movement.Status,
    val valuePaid: BigDecimal?
)

class FinancialPeriodCreationPreview(
    val recurringMovements: List<RecurringMovement>,
    val cards: List<CardReference>
)

class LaunchRequest(
    val recurringMovement: UUID,
    val value: BigDecimal?
)

class LaunchedRecurring(
    val recurringMovement: RecurringMovement,
    val movement: Movement,
    val installment: Int
)

class SkippedRecurring(
    val recurringMovement: RecurringMovement,
    val reason: String
)

class RecurringLaunchReport(
    val launched: List<LaunchedRecurring>,
    val skipped: List<SkippedRecurring>
)
