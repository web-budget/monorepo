package br.com.webbudget.server.infrastructure.repository

import org.jooq.Condition
import org.jooq.Field
import org.jooq.impl.DSL
import java.util.UUID

/**
 * Condition that leaves out the record with the given external id, used by the uniqueness checks that run on updates.
 * Without an id (a record not saved yet) there is nothing to leave out and it matches everything.
 */
fun Field<UUID?>.excluding(externalId: UUID?): Condition = externalId?.let { ne(it) } ?: DSL.noCondition()
