package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.InstanceSettings
import br.com.webbudget.server.jooq.administration.tables.references.INSTANCE_SETTINGS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
class InstanceSettingsRepository(
    private val dsl: DSLContext
) {

    fun find(): InstanceSettings? {
        val instanceSettings = INSTANCE_SETTINGS.`as`("instance_settings")
        return dsl.selectFrom(instanceSettings)
            .where(instanceSettings.ID.eq(SINGLE_ROW_ID))
            .fetchOne { record -> InstanceSettings(reserveMonths = record.reserveMonths!!) }
    }

    fun save(settings: InstanceSettings): InstanceSettings {
        val now = LocalDateTime.now()

        dsl.insertInto(INSTANCE_SETTINGS)
            .set(INSTANCE_SETTINGS.ID, SINGLE_ROW_ID)
            .set(INSTANCE_SETTINGS.RESERVE_MONTHS, settings.reserveMonths)
            .set(INSTANCE_SETTINGS.LAST_UPDATE, now)
            .onConflict(INSTANCE_SETTINGS.ID)
            .doUpdate()
            .set(INSTANCE_SETTINGS.RESERVE_MONTHS, settings.reserveMonths)
            .set(INSTANCE_SETTINGS.LAST_UPDATE, now)
            .execute()

        return settings
    }

    companion object {
        private const val SINGLE_ROW_ID: Short = 1
    }
}
