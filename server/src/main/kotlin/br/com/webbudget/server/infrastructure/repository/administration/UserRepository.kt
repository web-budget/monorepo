package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.administration.tables.Users
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class UserRepository(
    private val dsl: DSLContext,
    private val grantRepository: GrantRepository
) {

    fun existsByEmail(email: String): Boolean = dsl.fetchExists(
        dsl.selectOne().from(USERS).where(USERS.EMAIL.eq(email))
    )

    fun existsByEmailAndExternalIdNot(email: String, externalId: UUID): Boolean = dsl.fetchExists(
        dsl.selectOne().from(USERS).where(USERS.EMAIL.eq(email)).and(USERS.EXTERNAL_ID.ne(externalId))
    )

    fun findByExternalId(externalId: UUID): User? = findOne { users -> users.EXTERNAL_ID.eq(externalId) }

    fun findByEmail(email: String): User? = findOne { users -> users.EMAIL.eq(email) }

    fun findAll(filter: String?, active: Boolean?, pageable: Pageable): PagedModel<User> {

        val users = USERS.`as`("users")

        val condition = listOfNotNull(
            active?.let { users.ACTIVE.eq(it) },
            filter?.let { text -> likeIgnoreCase(users.NAME, text).or(likeIgnoreCase(users.EMAIL, text)) }
        ).fold(DSL.noCondition()) { accumulated, current -> accumulated.and(current) }

        val sortable = mapOf(
            "name" to users.NAME,
            "email" to users.EMAIL,
            "active" to users.ACTIVE,
            "createdOn" to users.CREATED_ON
        )

        val records = dsl.selectFrom(users)
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, users.ID.asc()))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()

        val grants = grantRepository.findByUserIds(records.map { it.id!! })
        val content = records.map { record -> record.toUser(grants[record.id].orEmpty()) }

        val total = dsl.fetchCount(users, condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun insert(user: User): User {
        val record = dsl.insertInto(USERS)
            .set(USERS.EXTERNAL_ID, UUID.randomUUID())
            .set(USERS.VERSION, 0)
            .set(USERS.CREATED_ON, LocalDateTime.now())
            .set(USERS.ACTIVE, user.active)
            .set(USERS.NAME, user.name)
            .set(USERS.EMAIL, user.email)
            .set(USERS.PASSWORD, user.password)
            .set(USERS.DEFAULT_LANGUAGE, user.defaultLanguage.name)
            .returning()
            .fetchSingle()

        user.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return user
    }

    fun update(user: User): User {
        val record = dsl.update(USERS)
            .set(USERS.ACTIVE, user.active)
            .set(USERS.NAME, user.name)
            .set(USERS.EMAIL, user.email)
            .set(USERS.PASSWORD, user.password)
            .set(USERS.DEFAULT_LANGUAGE, user.defaultLanguage.name)
            .set(USERS.VERSION, USERS.VERSION.plus(1))
            .set(USERS.LAST_UPDATE, LocalDateTime.now())
            .where(USERS.ID.eq(user.id))
            .and(USERS.VERSION.eq(user.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        user.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return user
    }

    fun delete(user: User) {
        dsl.deleteFrom(USERS)
            .where(USERS.ID.eq(user.id))
            .execute()
    }

    private fun findOne(condition: (Users) -> Condition): User? {
        val users = USERS.`as`("users")
        val record = dsl.selectFrom(users)
            .where(condition(users))
            .fetchOne() ?: return null

        val grants = grantRepository.findByUserIds(listOf(record.id!!))
        return record.toUser(grants[record.id].orEmpty())
    }

    private fun likeIgnoreCase(field: org.jooq.Field<String?>, text: String): Condition =
        DSL.lower(field).like("%${text.lowercase()}%")
}
