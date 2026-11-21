package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.jooq.financial.tables.references.PAYMENTS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class PaymentRepository(
    private val dsl: DSLContext
) {

    fun insert(movementId: Long, payment: Payment): Payment {
        val record = dsl.insertInto(PAYMENTS)
            .set(PAYMENTS.EXTERNAL_ID, UUID.randomUUID())
            .set(PAYMENTS.VERSION, 0)
            .set(PAYMENTS.CREATED_ON, LocalDateTime.now())
            .set(PAYMENTS.METHOD, payment.method.name)
            .set(PAYMENTS.PAID_ON, payment.paidOn)
            .set(PAYMENTS.VALUE, payment.value)
            .set(PAYMENTS.DISCOUNT, payment.discount)
            .set(PAYMENTS.VALUE_PAID, payment.valuePaid)
            .set(PAYMENTS.ID_MOVEMENT, movementId)
            .set(PAYMENTS.ID_WALLET, payment.wallet.id)
            .returning()
            .fetchSingle()

        payment.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return payment
    }

    fun deleteByMovement(movementId: Long) {
        dsl.deleteFrom(PAYMENTS)
            .where(PAYMENTS.ID_MOVEMENT.eq(movementId))
            .execute()
    }
}
