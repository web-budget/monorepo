package br.com.webbudget.server.infrastructure.repository.registration

import org.jooq.Condition
import org.jooq.Field
import org.jooq.impl.DSL

internal fun containsIgnoreCase(field: Field<String?>, text: String): Condition = field.containsIgnoreCase(text)

internal fun allOf(conditions: List<Condition>): Condition =
    conditions.fold(DSL.noCondition()) { accumulated, current -> accumulated.and(current) }

internal fun anyOf(conditions: List<Condition>): Condition =
    conditions.reduce { accumulated, current -> accumulated.or(current) }
