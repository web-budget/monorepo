package br.com.webbudget.server.application.mappers.administration

import br.com.webbudget.server.application.payloads.administration.MailSettingsForm
import br.com.webbudget.server.application.payloads.administration.MailSettingsView
import br.com.webbudget.server.domain.entities.administration.MailSettings
import org.springframework.stereotype.Component

@Component
class MailSettingsMapper {

    fun mapToView(settings: MailSettings, passwordStorageAvailable: Boolean): MailSettingsView = MailSettingsView(
        enabled = settings.enabled,
        configured = settings.isConfigured(),
        host = settings.host,
        port = settings.port,
        security = settings.security,
        username = settings.username,
        passwordSet = settings.hasPassword(),
        passwordStorageAvailable = passwordStorageAvailable,
        fromAddress = settings.fromAddress,
        fromName = settings.fromName,
        replyToAddress = settings.replyToAddress,
        lastUpdate = settings.lastUpdate
    )

    fun mapToDomain(form: MailSettingsForm): MailSettings = MailSettings(
        host = form.host,
        port = form.port,
        security = form.security!!,
        username = form.username,
        fromAddress = form.fromAddress,
        fromName = form.fromName,
        replyToAddress = form.replyToAddress
    )
}
