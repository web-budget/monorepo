package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.jooq.financial.tables.references.REPORT_LINES
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTER_TREE
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.DatePart
import org.jooq.impl.DSL
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Repository
class CompositionRepository(
    private val dsl: DSLContext
) {

    class CostCenterValue(val costCenterId: Long, val value: BigDecimal)

    class ClassificationValue(
        val classificationId: UUID,
        val classificationName: String,
        val costCenterId: UUID?,
        val value: BigDecimal
    )

    class MonthValue(
        val classificationId: UUID,
        val classificationName: String,
        val year: Int,
        val month: Int,
        val value: BigDecimal
    )

    class Month(val year: Int, val month: Int)

    private val lines = REPORT_LINES.`as`("report_lines")
    private val tree = COST_CENTER_TREE.`as`("cost_center_tree")
    private val periods = FINANCIAL_PERIODS.`as`("financial_periods")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val costCenters = COST_CENTERS.`as`("cost_centers")

    private val endingYear = DSL.extract(periods.ENDING_AT, DatePart.YEAR)
    private val endingMonth = DSL.extract(periods.ENDING_AT, DatePart.MONTH)

    fun sumExpensesBySubtree(year: Int?): List<CostCenterValue> = dsl
        .select(tree.ID_ANCESTOR, DSL.sum(lines.VALUE))
        .from(lines)
        .join(periods).on(periods.ID.eq(lines.ID_FINANCIAL_PERIOD))
        .join(tree).on(tree.ID_COST_CENTER.eq(lines.ID_COST_CENTER))
        .where(isOfType(Movement.Type.EXPENSE).and(inYear(year)))
        .groupBy(tree.ID_ANCESTOR)
        .fetch { record -> CostCenterValue(record.value1()!!, record.value2()!!) }

    fun sumExpensesByClassification(year: Int?): List<ClassificationValue> = dsl
        .select(classifications.EXTERNAL_ID, classifications.NAME, costCenters.EXTERNAL_ID, DSL.sum(lines.VALUE))
        .from(lines)
        .join(periods).on(periods.ID.eq(lines.ID_FINANCIAL_PERIOD))
        .join(classifications).on(classifications.ID.eq(lines.ID_CLASSIFICATION))
        .join(costCenters).on(costCenters.ID.eq(lines.ID_COST_CENTER))
        .where(isOfType(Movement.Type.EXPENSE).and(inYear(year)))
        .groupBy(classifications.EXTERNAL_ID, classifications.NAME, costCenters.EXTERNAL_ID)
        .fetch { record ->
            ClassificationValue(record.value1()!!, record.value2()!!, record.value3()!!, record.value4()!!)
        }

    fun sumRevenuesByClassification(year: Int?): List<ClassificationValue> = dsl
        .select(classifications.EXTERNAL_ID, classifications.NAME, DSL.sum(lines.VALUE))
        .from(lines)
        .join(periods).on(periods.ID.eq(lines.ID_FINANCIAL_PERIOD))
        .join(classifications).on(classifications.ID.eq(lines.ID_CLASSIFICATION))
        .where(isOfType(Movement.Type.INCOME).and(inYear(year)))
        .groupBy(classifications.EXTERNAL_ID, classifications.NAME)
        .fetch { record -> ClassificationValue(record.value1()!!, record.value2()!!, null, record.value3()!!) }

    fun sumExpensesByMonth(year: Int?): List<MonthValue> = dsl
        .select(classifications.EXTERNAL_ID, classifications.NAME, endingYear, endingMonth, DSL.sum(lines.VALUE))
        .from(lines)
        .join(periods).on(periods.ID.eq(lines.ID_FINANCIAL_PERIOD))
        .join(classifications).on(classifications.ID.eq(lines.ID_CLASSIFICATION))
        .where(isOfType(Movement.Type.EXPENSE).and(inYear(year)))
        .groupBy(classifications.EXTERNAL_ID, classifications.NAME, endingYear, endingMonth)
        .fetch { record ->
            MonthValue(record.value1()!!, record.value2()!!, record.value3()!!, record.value4()!!, record.value5()!!)
        }

    fun findMonthsWithMovement(year: Int?): List<Month> = dsl
        .selectDistinct(endingYear, endingMonth)
        .from(periods)
        .where(DSL.exists(DSL.selectOne().from(lines).where(lines.ID_FINANCIAL_PERIOD.eq(periods.ID))).and(inYear(year)))
        .fetch { record -> Month(record.value1()!!, record.value2()!!) }

    private fun isOfType(type: Movement.Type): Condition = lines.TYPE.eq(type.name)

    private fun inYear(year: Int?): Condition = year
        ?.let { periods.ENDING_AT.between(LocalDate.of(it, 1, 1), LocalDate.of(it, 12, 31)) }
        ?: DSL.noCondition()
}
