package br.com.webbudget.server.infrastructure.repository.registration

import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.containsIgnoringAccents
import br.com.webbudget.server.infrastructure.repository.excluding
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class CostCenterRepository(
    private val dsl: DSLContext
) {

    fun findByExternalId(externalId: UUID): CostCenter? {

        val costCenters = COST_CENTERS.`as`("cost_centers")
        val parents = COST_CENTERS.`as`("parents")

        val record = dsl.select()
            .from(costCenters)
            .leftJoin(parents).on(parents.ID.eq(costCenters.ID_PARENT))
            .where(costCenters.EXTERNAL_ID.eq(externalId))
            .fetchOne() ?: return null

        val parent = record.get(parents.ID)?.let { record.into(parents).toCostCenter() }

        return record.into(costCenters).toCostCenter(parent)
    }

    fun findChildren(parent: CostCenter): List<CostCenter> {
        val costCenters = COST_CENTERS.`as`("cost_centers")
        return dsl.selectFrom(costCenters)
            .where(costCenters.ID_PARENT.eq(parent.id))
            .orderBy(costCenters.ID)
            .fetch { record -> record.toCostCenter(parent) }
    }

    fun findParentId(id: Long): Long? = dsl.select(COST_CENTERS.ID_PARENT)
        .from(COST_CENTERS)
        .where(COST_CENTERS.ID.eq(id))
        .fetchOne(COST_CENTERS.ID_PARENT)

    fun findAll(filter: String?, active: Boolean?, pageable: Pageable): PagedModel<CostCenter> {

        val costCenters = COST_CENTERS.`as`("cost_centers")

        val textCondition = filter?.let { text ->
            DSL.or(
                costCenters.NAME.containsIgnoringAccents(text),
                costCenters.FULL_NAME.containsIgnoringAccents(text),
                costCenters.DESCRIPTION.containsIgnoringAccents(text)
            )
        }

        val condition = DSL.and(listOfNotNull(active?.let { costCenters.ACTIVE.eq(it) }, textCondition))

        val sortable = mapOf(
            "name" to costCenters.NAME,
            "fullName" to costCenters.FULL_NAME,
            "active" to costCenters.ACTIVE,
            "description" to costCenters.DESCRIPTION,
            "incomeBudget" to costCenters.INCOME_BUDGET,
            "expenseBudget" to costCenters.EXPENSE_BUDGET,
            "createdOn" to costCenters.CREATED_ON
        )

        val content = dsl.selectFrom(costCenters)
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, costCenters.CREATED_ON, costCenters.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch { record -> record.toCostCenter() }

        val total = dsl.fetchCount(costCenters, condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun existsByName(name: String, excludingExternalId: UUID? = null): Boolean = dsl.fetchExists(
        dsl.selectOne().from(COST_CENTERS)
            .where(COST_CENTERS.NAME.equalIgnoreCase(name))
            .and(COST_CENTERS.EXTERNAL_ID.excluding(excludingExternalId))
    )

    fun existsByFullName(fullName: String, excludingExternalId: UUID? = null): Boolean = dsl.fetchExists(
        dsl.selectOne().from(COST_CENTERS)
            .where(COST_CENTERS.FULL_NAME.equalIgnoreCase(fullName))
            .and(COST_CENTERS.EXTERNAL_ID.excluding(excludingExternalId))
    )

    fun insert(costCenter: CostCenter): CostCenter {

        val now = LocalDateTime.now()

        val record = dsl.insertInto(COST_CENTERS)
            .set(COST_CENTERS.EXTERNAL_ID, UUID.randomUUID())
            .set(COST_CENTERS.VERSION, 0)
            .set(COST_CENTERS.CREATED_ON, now)
            .set(COST_CENTERS.LAST_UPDATE, now)
            .set(COST_CENTERS.ACTIVE, costCenter.active)
            .set(COST_CENTERS.NAME, costCenter.name)
            .set(COST_CENTERS.FULL_NAME, costCenter.fullName)
            .set(COST_CENTERS.DESCRIPTION, costCenter.description)
            .set(COST_CENTERS.INCOME_BUDGET, costCenter.incomeBudget)
            .set(COST_CENTERS.EXPENSE_BUDGET, costCenter.expenseBudget)
            .set(COST_CENTERS.ID_PARENT, costCenter.parent?.id)
            .returning()
            .fetchSingle()

        costCenter.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return costCenter
    }

    fun update(costCenter: CostCenter): CostCenter {
        val record = dsl.update(COST_CENTERS)
            .set(COST_CENTERS.ACTIVE, costCenter.active)
            .set(COST_CENTERS.NAME, costCenter.name)
            .set(COST_CENTERS.FULL_NAME, costCenter.fullName)
            .set(COST_CENTERS.DESCRIPTION, costCenter.description)
            .set(COST_CENTERS.INCOME_BUDGET, costCenter.incomeBudget)
            .set(COST_CENTERS.EXPENSE_BUDGET, costCenter.expenseBudget)
            .set(COST_CENTERS.ID_PARENT, costCenter.parent?.id)
            .set(COST_CENTERS.VERSION, COST_CENTERS.VERSION.plus(1))
            .set(COST_CENTERS.LAST_UPDATE, LocalDateTime.now())
            .where(COST_CENTERS.ID.eq(costCenter.id))
            .and(COST_CENTERS.VERSION.eq(costCenter.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        costCenter.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return costCenter
    }

    fun delete(costCenter: CostCenter) {
        dsl.deleteFrom(COST_CENTERS)
            .where(COST_CENTERS.ID.eq(costCenter.id))
            .execute()
    }
}
