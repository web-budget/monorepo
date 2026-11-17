package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.PasswordRecoverAttempt
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.jooq.administration.tables.Users
import br.com.webbudget.server.jooq.administration.tables.records.PasswordRecoverAttemptsRecord
import br.com.webbudget.server.jooq.administration.tables.references.PASSWORD_RECOVER_ATTEMPTS
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import org.jooq.Condition
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID
import br.com.webbudget.server.jooq.administration.tables.PasswordRecoverAttempts as PasswordRecoverAttemptsTable

@Repository
class PasswordRecoverAttemptRepository(
    private val dsl: DSLContext
) {

    fun findByUserEmail(email: String): List<PasswordRecoverAttempt> =
        find { _, users -> users.EMAIL.eq(email) }

    fun findUnusedByTokenAndUserEmail(token: UUID, email: String): PasswordRecoverAttempt? =
        find { attempts, users ->
            attempts.TOKEN.eq(token).and(users.EMAIL.eq(email)).and(attempts.USED.isFalse)
        }.firstOrNull()

    fun insert(attempt: PasswordRecoverAttempt): PasswordRecoverAttempt {
        val record = dsl.insertInto(PASSWORD_RECOVER_ATTEMPTS)
            .set(PASSWORD_RECOVER_ATTEMPTS.EXTERNAL_ID, UUID.randomUUID())
            .set(PASSWORD_RECOVER_ATTEMPTS.VERSION, 0.toShort())
            .set(PASSWORD_RECOVER_ATTEMPTS.CREATED_ON, LocalDateTime.now())
            .set(PASSWORD_RECOVER_ATTEMPTS.TOKEN, attempt.token)
            .set(PASSWORD_RECOVER_ATTEMPTS.VALID_UNTIL, attempt.validity)
            .set(PASSWORD_RECOVER_ATTEMPTS.USED, attempt.used)
            .set(PASSWORD_RECOVER_ATTEMPTS.ID_USER, attempt.user.id)
            .returning()
            .fetchSingle()

        attempt.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return attempt
    }

    fun update(attempt: PasswordRecoverAttempt): PasswordRecoverAttempt {
        val record = dsl.update(PASSWORD_RECOVER_ATTEMPTS)
            .set(PASSWORD_RECOVER_ATTEMPTS.USED, attempt.used)
            .set(PASSWORD_RECOVER_ATTEMPTS.VALID_UNTIL, attempt.validity)
            .set(PASSWORD_RECOVER_ATTEMPTS.VERSION, PASSWORD_RECOVER_ATTEMPTS.VERSION.plus(1))
            .set(PASSWORD_RECOVER_ATTEMPTS.LAST_UPDATE, LocalDateTime.now())
            .where(PASSWORD_RECOVER_ATTEMPTS.ID.eq(attempt.id))
            .and(PASSWORD_RECOVER_ATTEMPTS.VERSION.eq(attempt.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        attempt.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return attempt
    }

    fun deleteByUserId(userId: Long) {
        dsl.deleteFrom(PASSWORD_RECOVER_ATTEMPTS)
            .where(PASSWORD_RECOVER_ATTEMPTS.ID_USER.eq(userId))
            .execute()
    }

    private fun find(condition: (PasswordRecoverAttemptsTable, Users) -> Condition): List<PasswordRecoverAttempt> {

        val attempts = PASSWORD_RECOVER_ATTEMPTS.`as`("password_recover_attempts")
        val users = USERS.`as`("users")

        return dsl.select()
            .from(attempts)
            .join(users).on(users.ID.eq(attempts.ID_USER))
            .where(condition(attempts, users))
            .orderBy(attempts.ID)
            .fetch { record -> toAttempt(record.into(attempts), record.into(users).toUser()) }
    }

    private fun toAttempt(record: PasswordRecoverAttemptsRecord, user: User): PasswordRecoverAttempt =
        PasswordRecoverAttempt(record.token!!, user, record.used!!, record.validUntil!!)
            .also { attempt ->
                attempt.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
            }
}
