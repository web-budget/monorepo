package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.application.mappers.administration.MailSettingsMapper
import br.com.webbudget.server.application.payloads.administration.MailEnabledForm
import br.com.webbudget.server.application.payloads.administration.MailSettingsForm
import br.com.webbudget.server.application.payloads.administration.MailSettingsView
import br.com.webbudget.server.domain.entities.administration.MailSettings
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.services.administration.MailSettingsService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequiresRole(Role.ADMINISTRATION)
@RequestMapping("/administration/mail-settings")
class MailSettingsController(
    private val mailSettingsMapper: MailSettingsMapper,
    private val mailSettingsService: MailSettingsService
) {

    @GetMapping
    fun get(): ResponseEntity<MailSettingsView> = respond(mailSettingsService.find())

    @PutMapping
    fun update(@RequestBody @Valid form: MailSettingsForm): ResponseEntity<MailSettingsView> {

        val updated = mailSettingsService.update(mailSettingsMapper.mapToDomain(form), form.password)

        return respond(updated)
    }

    @PatchMapping("/enabled")
    fun updateEnabled(@RequestBody @Valid form: MailEnabledForm): ResponseEntity<MailSettingsView> =
        respond(mailSettingsService.updateEnabled(form.enabled!!))

    private fun respond(settings: MailSettings): ResponseEntity<MailSettingsView> = ResponseEntity.ok(
        mailSettingsMapper.mapToView(settings, mailSettingsService.isPasswordStorageAvailable())
    )
}
