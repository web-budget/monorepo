package br.com.webbudget.server.domain.validators.administration

import br.com.webbudget.server.domain.entities.administration.InstanceSettings
import br.com.webbudget.server.domain.entities.administration.InstanceSettings.Companion.MAX_RESERVE_MONTHS
import br.com.webbudget.server.domain.entities.administration.InstanceSettings.Companion.MIN_RESERVE_MONTHS
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FIELD_VALIDATION_FAILED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.RESERVE_MONTHS_OUT_OF_RANGE
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
class ReserveMonthsRangeValidator : InstanceSettingsValidator {

    override fun validate(value: InstanceSettings) {
        if (value.reserveMonths !in MIN_RESERVE_MONTHS..MAX_RESERVE_MONTHS) {
            throw DomainException(
                "The reserve months must be between $MIN_RESERVE_MONTHS and $MAX_RESERVE_MONTHS",
                FIELD_VALIDATION_FAILED,
                mapOf("reserveMonths" to RESERVE_MONTHS_OUT_OF_RANGE)
            )
        }
    }
}
