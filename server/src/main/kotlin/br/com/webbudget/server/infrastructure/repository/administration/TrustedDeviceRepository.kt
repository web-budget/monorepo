package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.TrustedDevice
import br.com.webbudget.server.jooq.administration.tables.records.TrustedDevicesRecord
import br.com.webbudget.server.jooq.administration.tables.references.TRUSTED_DEVICES
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class TrustedDeviceRepository(
    private val dsl: DSLContext
) {

    fun findValidByTokenHashAndUserId(tokenHash: String, userId: Long, now: LocalDateTime): TrustedDevice? {

        val trustedDevices = TRUSTED_DEVICES.`as`("trusted_devices")

        return dsl.selectFrom(trustedDevices)
            .where(trustedDevices.TOKEN_HASH.eq(tokenHash))
            .and(trustedDevices.ID_USER.eq(userId))
            .and(trustedDevices.EXPIRES_ON.gt(now))
            .fetchOne()
            ?.toTrustedDevice()
    }

    fun findValidByUserId(userId: Long, now: LocalDateTime): List<TrustedDevice> {

        val trustedDevices = TRUSTED_DEVICES.`as`("trusted_devices")

        return dsl.selectFrom(trustedDevices)
            .where(trustedDevices.ID_USER.eq(userId))
            .and(trustedDevices.EXPIRES_ON.gt(now))
            .orderBy(trustedDevices.LAST_USED_ON.desc(), trustedDevices.ID.desc())
            .fetch()
            .map { record -> record.toTrustedDevice() }
    }

    fun insert(userId: Long, tokenHash: String, label: String, expiresOn: LocalDateTime, now: LocalDateTime) {
        dsl.insertInto(TRUSTED_DEVICES)
            .set(TRUSTED_DEVICES.EXTERNAL_ID, UUID.randomUUID())
            .set(TRUSTED_DEVICES.VERSION, 0.toShort())
            .set(TRUSTED_DEVICES.CREATED_ON, now)
            .set(TRUSTED_DEVICES.ID_USER, userId)
            .set(TRUSTED_DEVICES.TOKEN_HASH, tokenHash)
            .set(TRUSTED_DEVICES.LABEL, label)
            .set(TRUSTED_DEVICES.LAST_USED_ON, now)
            .set(TRUSTED_DEVICES.EXPIRES_ON, expiresOn)
            .execute()
    }

    fun touch(id: Long, now: LocalDateTime) {
        dsl.update(TRUSTED_DEVICES)
            .set(TRUSTED_DEVICES.LAST_USED_ON, now)
            .where(TRUSTED_DEVICES.ID.eq(id))
            .execute()
    }

    fun deleteByExternalIdAndUserId(externalId: UUID, userId: Long): Int = dsl.deleteFrom(TRUSTED_DEVICES)
        .where(TRUSTED_DEVICES.EXTERNAL_ID.eq(externalId))
        .and(TRUSTED_DEVICES.ID_USER.eq(userId))
        .execute()

    fun deleteByUserId(userId: Long): Int = dsl.deleteFrom(TRUSTED_DEVICES)
        .where(TRUSTED_DEVICES.ID_USER.eq(userId))
        .execute()

    fun deleteExpiredByUserId(userId: Long, now: LocalDateTime): Int = dsl.deleteFrom(TRUSTED_DEVICES)
        .where(TRUSTED_DEVICES.ID_USER.eq(userId))
        .and(TRUSTED_DEVICES.EXPIRES_ON.le(now))
        .execute()

    private fun TrustedDevicesRecord.toTrustedDevice(): TrustedDevice = TrustedDevice(
        label = label!!,
        lastUsedOn = lastUsedOn!!,
        expiresOn = expiresOn!!
    ).also { device -> device.restore(id, externalId, version, createdOn, lastUpdate) }
}
