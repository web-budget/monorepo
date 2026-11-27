package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.InstanceSettings
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.administration.InstanceSettingsValidator
import br.com.webbudget.server.infrastructure.repository.administration.InstanceSettingsRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class InstanceSettingsService(
    private val instanceSettingsRepository: InstanceSettingsRepository,
    @OnUpdateValidation
    private val updateValidators: List<InstanceSettingsValidator>
) {

    fun find(): InstanceSettings = instanceSettingsRepository.find() ?: InstanceSettings()

    fun reserveMonths(): Int = find().reserveMonths

    @Transactional
    fun update(settings: InstanceSettings): InstanceSettings {

        updateValidators.forEach { it.validate(settings) }

        return instanceSettingsRepository.save(settings)
    }
}
