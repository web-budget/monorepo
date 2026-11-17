package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.AccountActivationAttempt
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.jooq.administration.tables.records.AccountActivationAttemptRecord
import br.com.webbudget.server.jooq.administration.tables.references.ACCOUNT_ACTIVATION_ATTEMPT
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class AccountActivationAttemptRepository(
    private val dsl: DSLContext
) {

    fun findByUserEmail(email: String): List<AccountActivationAttempt> =
        find { _, users -> users.EMAIL.eq(email) }

    fun findPendingByTokenAndUserEmail(token: UUID, email: String): AccountActivationAttempt? =
        find { attempts, users ->
            attempts.TOKEN.eq(token).and(users.EMAIL.eq(email)).and(attempts.ACTIVATED_ON.isNull)
        }.firstOrNull()

    fun insert(attempt: AccountActivationAttempt): AccountActivationAttempt {
        val record = dsl.insertInto(ACCOUNT_ACTIVATION_ATTEMPT)
            .set(ACCOUNT_ACTIVATION_ATTEMPT.EXTERNAL_ID, UUID.randomUUID())
            .set(ACCOUNT_ACTIVATION_ATTEMPT.VERSION, 0.toShort())
            .set(ACCOUNT_ACTIVATION_ATTEMPT.CREATED_ON, LocalDateTime.now())
            .set(ACCOUNT_ACTIVATION_ATTEMPT.TOKEN, attempt.token)
            .set(ACCOUNT_ACTIVATION_ATTEMPT.VALID_UNTIL, attempt.validity)
            .set(ACCOUNT_ACTIVATION_ATTEMPT.ACTIVATED_ON, attempt.activatedOn)
            .set(ACCOUNT_ACTIVATION_ATTEMPT.ID_USER, attempt.user.id)
            .returning()
            .fetchSingle()

        attempt.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return attempt
    }

    fun update(attempt: AccountActivationAttempt): AccountActivationAttempt {
        val record = dsl.update(ACCOUNT_ACTIVATION_ATTEMPT)
            .set(ACCOUNT_ACTIVATION_ATTEMPT.ACTIVATED_ON, attempt.activatedOn)
            .set(ACCOUNT_ACTIVATION_ATTEMPT.VALID_UNTIL, attempt.validity)
            .set(ACCOUNT_ACTIVATION_ATTEMPT.VERSION, ACCOUNT_ACTIVATION_ATTEMPT.VERSION.plus(1))
            .set(ACCOUNT_ACTIVATION_ATTEMPT.LAST_UPDATE, LocalDateTime.now())
            .where(ACCOUNT_ACTIVATION_ATTEMPT.ID.eq(attempt.id))
            .and(ACCOUNT_ACTIVATION_ATTEMPT.VERSION.eq(attempt.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        attempt.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return attempt
    }

    fun deleteByUserId(userId: Long) {
        dsl.deleteFrom(ACCOUNT_ACTIVATION_ATTEMPT)
            .where(ACCOUNT_ACTIVATION_ATTEMPT.ID_USER.eq(userId))
            .execute()
    }

    private fun find(
        condition: (br.com.webbudget.server.jooq.administration.tables.AccountActivationAttempt,
                    br.com.webbudget.server.jooq.administration.tables.Users) -> Condition
    ): List<AccountActivationAttempt> {

        val attempts = ACCOUNT_ACTIVATION_ATTEMPT.`as`("account_activation_attempt")
        val users = USERS.`as`("users")

        return dsl.select()
            .from(attempts)
            .join(users).on(users.ID.eq(attempts.ID_USER))
            .where(condition(attempts, users))
            .orderBy(attempts.ID)
            .fetch { record -> toAttempt(record.into(attempts), record.into(users).toUser()) }
    }

    private fun toAttempt(record: AccountActivationAttemptRecord, user: User): AccountActivationAttempt =
        AccountActivationAttempt(record.token!!, user, record.activatedOn, record.validUntil!!)
            .also { attempt ->
                attempt.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
            }
}
