package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_OPEN
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnPayValidation
import br.com.webbudget.server.domain.validators.OnUndoPaymentValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

@Component
@OnCreateValidation
@OnUpdateValidation
@OnDeleteValidation
@OnPayValidation
@OnUndoPaymentValidation
class MovementFinancialPeriodValidator : MovementValidator {

    override fun validate(value: Movement) {
        if (!value.financialPeriod.isOpen()) {
            throw DomainException("The financial period of the movement is not open", FINANCIAL_PERIOD_NOT_OPEN)
        }
    }
}
