package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.MailSettings
import br.com.webbudget.server.domain.exceptions.MailNotConfiguredException
import br.com.webbudget.server.domain.mail.MailMessage
import br.com.webbudget.server.domain.mail.MailPasswordCipher
import br.com.webbudget.server.domain.mail.MailSender
import br.com.webbudget.server.domain.security.CurrentUserProvider
import br.com.webbudget.server.infrastructure.repository.administration.MailSettingsRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class MailSettingsService(
    private val mailSettingsRepository: MailSettingsRepository,
    private val mailPasswordCipher: MailPasswordCipher,
    private val mailSender: MailSender,
    private val currentUserProvider: CurrentUserProvider
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

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    fun sendTest(recipient: String) {

        val language = currentUserProvider.getCurrentUser().language

        mailSender.sendTest(MailMessage(to = listOf(recipient), templateName = TEST_TEMPLATE, locale = language.locale))
    }

    private fun String?.trimmedOrNull(): String? = this?.trim()?.takeIf { it.isNotEmpty() }

    companion object {
        private const val TEST_TEMPLATE = "mail-test"
    }
}
