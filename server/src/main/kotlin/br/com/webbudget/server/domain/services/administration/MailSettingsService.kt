package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.MailSettings
import br.com.webbudget.server.domain.exceptions.MailNotConfiguredException
import br.com.webbudget.server.domain.mail.MailPasswordCipher
import br.com.webbudget.server.infrastructure.repository.administration.MailSettingsRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class MailSettingsService(
    private val mailSettingsRepository: MailSettingsRepository,
    private val mailPasswordCipher: MailPasswordCipher
) {

    fun find(): MailSettings = mailSettingsRepository.find()

    fun isPasswordStorageAvailable(): Boolean = mailPasswordCipher.isAvailable()

    @Transactional
    fun update(settings: MailSettings, password: String?): MailSettings {

        val username = settings.username.trimmedOrNull()

        val toSave = MailSettings(
            host = settings.host.trimmedOrNull(),
            port = settings.port,
            security = settings.security,
            username = username,
            passwordCiphertext = password
                ?.takeIf { username != null && it.isNotEmpty() }
                ?.let(mailPasswordCipher::encrypt),
            fromAddress = settings.fromAddress.trimmedOrNull(),
            fromName = settings.fromName.trimmedOrNull(),
            replyToAddress = settings.replyToAddress.trimmedOrNull()
        )

        return mailSettingsRepository.updateServer(toSave)
    }

    @Transactional
    fun updateEnabled(enabled: Boolean): MailSettings {

        if (enabled && !mailSettingsRepository.find().isConfigured()) {
            throw MailNotConfiguredException()
        }

        return mailSettingsRepository.updateEnabled(enabled)
    }

    private fun String?.trimmedOrNull(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
}
