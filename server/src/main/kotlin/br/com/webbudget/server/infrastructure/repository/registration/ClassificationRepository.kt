package br.com.webbudget.server.infrastructure.repository.registration

import br.com.webbudget.server.domain.entities.registration.Classification
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.excluding
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class ClassificationRepository(
    private val dsl: DSLContext
) {

    fun findByExternalId(externalId: UUID): Classification? {
        val classifications = CLASSIFICATIONS.`as`("classifications")
        return dsl.selectFrom(classifications)
            .where(classifications.EXTERNAL_ID.eq(externalId))
            .fetchOne { record -> record.toClassification() }
    }

    fun findAll(filter: String?, active: Boolean?, pageable: Pageable): PagedModel<Classification> {

        val classifications = CLASSIFICATIONS.`as`("classifications")

        val textCondition = filter?.let { text ->
            DSL.or(
                classifications.NAME.containsIgnoreCase(text),
                classifications.DESCRIPTION.containsIgnoreCase(text)
            )
        }

        val condition = DSL.and(listOfNotNull(active?.let { classifications.ACTIVE.eq(it) }, textCondition))

        val sortable = mapOf(
            "name" to classifications.NAME,
            "type" to classifications.TYPE,
            "active" to classifications.ACTIVE,
            "description" to classifications.DESCRIPTION,
            "createdOn" to classifications.CREATED_ON
        )

        val content = dsl.selectFrom(classifications)
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, classifications.CREATED_ON, classifications.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch { record -> record.toClassification() }

        val total = dsl.fetchCount(classifications, condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun existsByName(name: String, excludingExternalId: UUID? = null): Boolean = dsl.fetchExists(
        dsl.selectOne().from(CLASSIFICATIONS)
            .where(CLASSIFICATIONS.NAME.equalIgnoreCase(name))
            .and(CLASSIFICATIONS.EXTERNAL_ID.excluding(excludingExternalId))
    )

    fun insert(classification: Classification): Classification {
        val record = dsl.insertInto(CLASSIFICATIONS)
            .set(CLASSIFICATIONS.EXTERNAL_ID, UUID.randomUUID())
            .set(CLASSIFICATIONS.VERSION, 0)
            .set(CLASSIFICATIONS.CREATED_ON, LocalDateTime.now())
            .set(CLASSIFICATIONS.ACTIVE, classification.active)
            .set(CLASSIFICATIONS.NAME, classification.name)
            .set(CLASSIFICATIONS.TYPE, classification.type.name)
            .set(CLASSIFICATIONS.DESCRIPTION, classification.description)
            .returning()
            .fetchSingle()

        classification.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return classification
    }

    fun update(classification: Classification): Classification {
        val record = dsl.update(CLASSIFICATIONS)
            .set(CLASSIFICATIONS.ACTIVE, classification.active)
            .set(CLASSIFICATIONS.NAME, classification.name)
            .set(CLASSIFICATIONS.TYPE, classification.type.name)
            .set(CLASSIFICATIONS.DESCRIPTION, classification.description)
            .set(CLASSIFICATIONS.VERSION, CLASSIFICATIONS.VERSION.plus(1))
            .set(CLASSIFICATIONS.LAST_UPDATE, LocalDateTime.now())
            .where(CLASSIFICATIONS.ID.eq(classification.id))
            .and(CLASSIFICATIONS.VERSION.eq(classification.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        classification.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return classification
    }

    fun delete(classification: Classification) {
        dsl.deleteFrom(CLASSIFICATIONS)
            .where(CLASSIFICATIONS.ID.eq(classification.id))
            .execute()
    }
}
