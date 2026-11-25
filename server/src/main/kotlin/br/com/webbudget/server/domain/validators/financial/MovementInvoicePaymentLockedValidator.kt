package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVOICE_PAYMENT_LOCKED
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
class MovementInvoicePaymentLockedValidator : MovementValidator {

    override fun validate(value: Movement) {
        if (value.isInvoicePayment()) {
            throw DomainException("The payment of an invoice can not be edited", INVOICE_PAYMENT_LOCKED)
        }
    }
}
