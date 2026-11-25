package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_WALLET
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_DISCOUNT
import br.com.webbudget.server.domain.exceptions.ErrorCodes.PAYMENT_DATE_IN_FUTURE
import br.com.webbudget.server.domain.validators.OnPayValidation
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDate

@Component
@OnPayValidation
class MovementPaymentValidator : MovementValidator {

    override fun validate(value: Movement) {

        val payment = value.payment!!

        if (!payment.wallet.active) {
            throw DomainException("The wallet of the payment is not active", INACTIVE_WALLET)
        }

        if (payment.discount < BigDecimal.ZERO || payment.discount >= payment.value) {
            throw DomainException("The discount must be between zero and the value of the movement", INVALID_DISCOUNT)
        }

        if (payment.paidOn.isAfter(LocalDate.now())) {
            throw DomainException("The payment date can not be in the future", PAYMENT_DATE_IN_FUTURE)
        }
    }
}
