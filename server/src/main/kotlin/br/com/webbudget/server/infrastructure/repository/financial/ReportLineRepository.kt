package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.jooq.financial.tables.references.REPORT_LINES
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTER_TREE
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.math.RoundingMode

@Repository
class ReportLineRepository(
    private val dsl: DSLContext
) {

    class TypeTotal(val type: String, val total: BigDecimal, val fixed: BigDecimal)

    class SubtreeValue(val costCenterId: Long, val type: String, val value: BigDecimal)

    private val lines = REPORT_LINES.`as`("report_lines")
    private val tree = COST_CENTER_TREE.`as`("cost_center_tree")
    private val periods = FINANCIAL_PERIODS.`as`("financial_periods")

    fun sumByType(financialPeriodId: Long): Map<Movement.Type, TypeTotal> {

        val total = DSL.sum(lines.VALUE)
        val fixed = DSL.coalesce(DSL.sum(lines.VALUE).filterWhere(lines.FIXED), BigDecimal.ZERO)

        val found = dsl.select(lines.TYPE, total, fixed)
            .from(lines)
            .where(lines.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
            .groupBy(lines.TYPE)
            .fetch { record -> TypeTotal(record.value1()!!, record.value2()!!, record.value3()!!) }
            .associateBy { it.type }

        return Movement.Type.entries.associateWith { type ->
            found[type.name] ?: TypeTotal(type.name, BigDecimal.ZERO, BigDecimal.ZERO)
        }
    }

    fun sumBySubtree(financialPeriodId: Long): List<SubtreeValue> = dsl
        .select(tree.ID_ANCESTOR, lines.TYPE, DSL.sum(lines.VALUE))
        .from(lines)
        .join(tree).on(tree.ID_COST_CENTER.eq(lines.ID_COST_CENTER))
        .where(lines.ID_FINANCIAL_PERIOD.eq(financialPeriodId))
        .groupBy(tree.ID_ANCESTOR, lines.TYPE)
        .fetch { record -> SubtreeValue(record.value1()!!, record.value2()!!, record.value3()!!) }

    fun countClosedPeriods(): Int = dsl.fetchCount(periods, periods.STATUS.eq(CLOSED))

    fun medianBySubtree(): List<SubtreeValue> {

        val closedWindow = DSL.name("closed_window").`as`(
            DSL.select(periods.ID)
                .from(periods)
                .where(periods.STATUS.eq(CLOSED))
                .orderBy(periods.ENDING_AT.desc(), periods.ID.desc())
                .limit(SUGGESTION_WINDOW)
        )
        val windowId = closedWindow.field(periods.ID)!!

        val usage = DSL.name("window_usage").`as`(
            DSL.select(
                tree.ID_ANCESTOR.`as`(COST_CENTER),
                lines.TYPE.`as`(TYPE),
                lines.ID_FINANCIAL_PERIOD.`as`(PERIOD),
                DSL.sum(lines.VALUE).`as`(VALUE)
            )
                .from(lines)
                .join(tree).on(tree.ID_COST_CENTER.eq(lines.ID_COST_CENTER))
                .where(lines.ID_FINANCIAL_PERIOD.`in`(DSL.select(windowId).from(closedWindow)))
                .groupBy(tree.ID_ANCESTOR, lines.TYPE, lines.ID_FINANCIAL_PERIOD)
        )
        val usageCostCenter = usage.field(COST_CENTER, Long::class.java)!!
        val usageType = usage.field(TYPE, String::class.java)!!
        val usagePeriod = usage.field(PERIOD, Long::class.java)!!
        val usageValue = usage.field(VALUE, BigDecimal::class.java)!!

        val combinations = DSL.name("combinations").`as`(DSL.selectDistinct(usageCostCenter, usageType).from(usage))
        val combinationCostCenter = combinations.field(COST_CENTER, Long::class.java)!!
        val combinationType = combinations.field(TYPE, String::class.java)!!

        val median = DSL.percentileCont(MEDIAN)
            .withinGroupOrderBy(DSL.coalesce(usageValue, BigDecimal.ZERO))

        return dsl.with(closedWindow).with(usage).with(combinations)
            .select(combinationCostCenter, combinationType, median)
            .from(combinations)
            .crossJoin(closedWindow)
            .leftJoin(usage).on(
                usageCostCenter.eq(combinationCostCenter)
                    .and(usageType.eq(combinationType))
                    .and(usagePeriod.eq(windowId))
            )
            .groupBy(combinationCostCenter, combinationType)
            .fetch { record ->
                SubtreeValue(
                    record.value1()!!,
                    record.value2()!!,
                    record.value3()!!.setScale(MONEY_SCALE, RoundingMode.HALF_UP)
                )
            }
    }

    companion object {
        const val SUGGESTION_WINDOW = 12
        const val SUGGESTION_MINIMUM = 3
        private const val CLOSED = "CLOSED"
        private const val MEDIAN = 0.5
        private const val MONEY_SCALE = 2
        private const val COST_CENTER = "id_cost_center"
        private const val TYPE = "type"
        private const val PERIOD = "id_financial_period"
        private const val VALUE = "value"
    }
}
