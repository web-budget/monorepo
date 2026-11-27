package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.application.mappers.administration.InstanceSettingsMapper
import br.com.webbudget.server.application.payloads.administration.InstanceSettingsForm
import br.com.webbudget.server.application.payloads.administration.InstanceSettingsView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.services.administration.InstanceSettingsService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequiresRole(Role.ADMINISTRATION)
@RequestMapping("/administration/settings")
class InstanceSettingsController(
    private val instanceSettingsMapper: InstanceSettingsMapper,
    private val instanceSettingsService: InstanceSettingsService
) {

    @GetMapping
    fun get(): ResponseEntity<InstanceSettingsView> =
        ResponseEntity.ok(instanceSettingsMapper.mapToView(instanceSettingsService.find()))

    @PutMapping
    fun update(@RequestBody @Valid form: InstanceSettingsForm): ResponseEntity<InstanceSettingsView> {

        val updated = instanceSettingsService.update(instanceSettingsMapper.mapToDomain(form))

        return ResponseEntity.ok(instanceSettingsMapper.mapToView(updated))
    }
}
