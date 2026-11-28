package br.com.webbudget.server.infrastructure.repository.administration

import br.com.webbudget.server.domain.entities.administration.MailSecurity
import br.com.webbudget.server.domain.entities.administration.MailSettings
import br.com.webbudget.server.jooq.administration.tables.records.MailSettingsRecord
import br.com.webbudget.server.jooq.administration.tables.references.MAIL_SETTINGS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
class MailSettingsRepository(
    private val dsl: DSLContext
) {

    fun find(): MailSettings {
        val mailSettings = MAIL_SETTINGS.`as`("mail_settings")
        return dsl.selectFrom(mailSettings)
            .where(mailSettings.ID.eq(SINGLE_ROW_ID))
            .fetchSingle()
            .toMailSettings()
    }

    fun updateServer(settings: MailSettings): MailSettings {

        val update = dsl.update(MAIL_SETTINGS)
            .set(MAIL_SETTINGS.HOST, settings.host)
            .set(MAIL_SETTINGS.PORT, settings.port)
            .set(MAIL_SETTINGS.SECURITY, settings.security.name)
            .set(MAIL_SETTINGS.USERNAME, settings.username)
            .set(MAIL_SETTINGS.FROM_ADDRESS, settings.fromAddress)
            .set(MAIL_SETTINGS.FROM_NAME, settings.fromName)
            .set(MAIL_SETTINGS.REPLY_TO_ADDRESS, settings.replyToAddress)
            .set(MAIL_SETTINGS.LAST_UPDATE, LocalDateTime.now())

        if (settings.username == null) {
            update.setNull(MAIL_SETTINGS.PASSWORD_CIPHERTEXT)
        } else if (settings.passwordCiphertext != null) {
            update.set(MAIL_SETTINGS.PASSWORD_CIPHERTEXT, settings.passwordCiphertext)
        }

        return update
            .where(MAIL_SETTINGS.ID.eq(SINGLE_ROW_ID))
            .returning()
            .fetchSingle()
            .toMailSettings()
    }

    fun updateEnabled(enabled: Boolean): MailSettings = dsl.update(MAIL_SETTINGS)
        .set(MAIL_SETTINGS.ENABLED, enabled)
        .set(MAIL_SETTINGS.LAST_UPDATE, LocalDateTime.now())
        .where(MAIL_SETTINGS.ID.eq(SINGLE_ROW_ID))
        .returning()
        .fetchSingle()
        .toMailSettings()

    private fun MailSettingsRecord.toMailSettings() = MailSettings(
        enabled = enabled!!,
        host = host,
        port = port,
        security = MailSecurity.valueOf(security!!),
        username = username,
        passwordCiphertext = passwordCiphertext,
        fromAddress = fromAddress,
        fromName = fromName,
        replyToAddress = replyToAddress,
        lastUpdate = lastUpdate
    )

    companion object {
        private const val SINGLE_ROW_ID: Short = 1
    }
}
