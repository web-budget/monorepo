package br.com.webbudget.server.infrastructure.repository.financial

import org.jooq.Condition
import org.jooq.Field
import org.jooq.impl.DSL
import java.math.BigDecimal

internal fun String.toDecimalOrNull(): BigDecimal? = replace(",", ".").toBigDecimalOrNull()

internal fun containsIgnoreCase(field: Field<String?>, text: String): Condition =
    DSL.lower(field).like("%${text.lowercase()}%")
