package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_LAUNCHES
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class RecurringLaunchRepository(
    private val dsl: DSLContext
) {

    fun exists(recurringMovementId: Long, financialPeriodId: Long): Boolean = dsl.fetchExists(
        dsl.selectOne().from(RECURRING_LAUNCHES)
            .where(RECURRING_LAUNCHES.ID_RECURRING_MOVEMENT.eq(recurringMovementId))
            .and(RECURRING_LAUNCHES.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
    )

    fun countByRecurringMovement(recurringMovementId: Long): Int = dsl.fetchCount(
        RECURRING_LAUNCHES,
        RECURRING_LAUNCHES.ID_RECURRING_MOVEMENT.eq(recurringMovementId)
    )

    fun insert(recurringMovementId: Long, financialPeriodId: Long, installment: Int, movementId: Long) {
        dsl.insertInto(RECURRING_LAUNCHES)
            .set(RECURRING_LAUNCHES.EXTERNAL_ID, UUID.randomUUID())
            .set(RECURRING_LAUNCHES.VERSION, 0)
            .set(RECURRING_LAUNCHES.CREATED_ON, LocalDateTime.now())
            .set(RECURRING_LAUNCHES.ID_RECURRING_MOVEMENT, recurringMovementId)
            .set(RECURRING_LAUNCHES.ID_FINANCIAL_PERIOD, financialPeriodId)
            .set(RECURRING_LAUNCHES.INSTALLMENT, installment)
            .set(RECURRING_LAUNCHES.ID_MOVEMENT, movementId)
            .execute()
    }
}
