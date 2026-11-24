package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.Card
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_INVOICE_PAYMENT_DAY
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

@Component
@OnCreateValidation
@OnUpdateValidation
class CreditCardInvoicePaymentDayValidator : CardValidator {

    override fun validate(value: Card) {

        val paymentDay = value.invoicePaymentDay ?: return

        if (paymentDay !in VALID_DAYS) {
            throw DomainException(
                "Credit card has invalid invoice payment day",
                INVALID_INVOICE_PAYMENT_DAY,
                mapOf("payment-day" to paymentDay.toString())
            )
        }
    }

    companion object {
        private val VALID_DAYS = 1..30
    }
}
