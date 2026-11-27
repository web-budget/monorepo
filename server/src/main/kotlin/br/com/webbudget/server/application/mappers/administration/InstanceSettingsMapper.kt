package br.com.webbudget.server.application.mappers.administration

import br.com.webbudget.server.application.payloads.administration.InstanceSettingsForm
import br.com.webbudget.server.application.payloads.administration.InstanceSettingsView
import br.com.webbudget.server.domain.entities.administration.InstanceSettings
import org.springframework.stereotype.Component

@Component
class InstanceSettingsMapper {

    fun mapToView(settings: InstanceSettings): InstanceSettingsView = InstanceSettingsView(
        reserveMonths = settings.reserveMonths
    )

    fun mapToDomain(form: InstanceSettingsForm): InstanceSettings = InstanceSettings(
        reserveMonths = form.reserveMonths!!
    )
}
