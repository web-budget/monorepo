package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.Compartment
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.COMPARTMENT_GOAL_FIELDS_NOT_ALLOWED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.COMPARTMENT_TARGET_DATE_IN_PAST
import br.com.webbudget.server.domain.exceptions.ErrorCodes.COMPARTMENT_WITH_BALANCE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.DUPLICATED_COMPARTMENT_NAME
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_WALLET
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_COMPARTMENT_TARGET_VALUE
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.registration.CompartmentRepository
import org.springframework.stereotype.Component
import java.time.LocalDate

interface CompartmentValidator : BusinessValidator<Compartment>

@Component
@OnCreateValidation
@OnUpdateValidation
@OnDeleteValidation
class CompartmentWalletValidator : CompartmentValidator {

    override fun validate(value: Compartment) {
        if (!value.wallet.active) {
            throw DomainException("The wallet of the compartment is not active", INACTIVE_WALLET)
        }
    }
}

@Component
@OnCreateValidation
@OnUpdateValidation
class CompartmentNameValidator(
    private val compartmentRepository: CompartmentRepository
) : CompartmentValidator {

    override fun validate(value: Compartment) {
        if (compartmentRepository.existsByName(value.wallet.id!!, value.name, value.externalId)) {
            throw DomainException.conflict(
                parameters = mapOf("compartment.name" to value.name),
                error = DUPLICATED_COMPARTMENT_NAME
            )
        }
    }
}

@Component
@OnCreateValidation
@OnUpdateValidation
class CompartmentGoalFieldsValidator : CompartmentValidator {

    override fun validate(value: Compartment) {
        if (value.type != Compartment.Type.GOAL && value.hasGoalFields()) {
            throw DomainException("Only a goal compartment can have goal fields", COMPARTMENT_GOAL_FIELDS_NOT_ALLOWED)
        }
    }
}

@Component
@OnCreateValidation
@OnUpdateValidation
class CompartmentTargetValueValidator : CompartmentValidator {

    override fun validate(value: Compartment) {
        if (value.targetValue != null && value.targetValue!!.signum() <= 0) {
            throw DomainException("The target value must be greater than zero", INVALID_COMPARTMENT_TARGET_VALUE)
        }
    }
}

@Component
@OnCreateValidation
@OnUpdateValidation
class CompartmentTargetDateValidator : CompartmentValidator {

    override fun validate(value: Compartment) {

        val targetDate = value.targetDate ?: return

        val isChanging = !value.isSaved() || value.hasTargetDateChanged()

        if (isChanging && targetDate.isBefore(LocalDate.now())) {
            throw DomainException("The target date can not be before today", COMPARTMENT_TARGET_DATE_IN_PAST)
        }
    }
}

@Component
@OnDeleteValidation
class CompartmentBalanceValidator : CompartmentValidator {

    override fun validate(value: Compartment) {
        if (value.balance.signum() != 0) {
            throw DomainException(
                "A compartment with balance can not be deleted",
                COMPARTMENT_WITH_BALANCE,
                mapOf("balance" to value.balance)
            )
        }
    }
}
