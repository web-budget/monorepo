package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.CARD_PAYMENT_ONLY_FOR_EXPENSES
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_CARD
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_WALLET
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_DISCOUNT
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVOICE_PAYMENT_NOT_PAYABLE_BY_CARD
import br.com.webbudget.server.domain.exceptions.ErrorCodes.PAYMENT_DATE_IN_FUTURE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.PAYMENT_REQUIRES_WALLET_OR_CARD
import br.com.webbudget.server.domain.validators.OnPayValidation
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDate

@Component
@OnPayValidation
class MovementPaymentValidator : MovementValidator {

    override fun validate(value: Movement) {

        val payment = value.payment!!
        val wallet = payment.wallet
        val card = payment.card

        if ((wallet == null) == (card == null)) {
            throw DomainException("A payment needs exactly one wallet or card", PAYMENT_REQUIRES_WALLET_OR_CARD)
        }

        if (wallet != null && !wallet.active) {
            throw DomainException("The wallet of the payment is not active", INACTIVE_WALLET)
        }

        if (card != null && value.isInvoicePayment()) {
            throw DomainException("An invoice payment can not be paid by card", INVOICE_PAYMENT_NOT_PAYABLE_BY_CARD)
        }

        if (card != null && value.type != Movement.Type.EXPENSE) {
            throw DomainException("Only an expense can be paid by card", CARD_PAYMENT_ONLY_FOR_EXPENSES)
        }

        if (card != null && !card.active) {
            throw DomainException("The card of the payment is not active", INACTIVE_CARD)
        }

        if (payment.discount < BigDecimal.ZERO || payment.discount >= payment.value) {
            throw DomainException("The discount must be between zero and the value of the movement", INVALID_DISCOUNT)
        }

        if (payment.paidOn.isAfter(LocalDate.now())) {
            throw DomainException("The payment date can not be in the future", PAYMENT_DATE_IN_FUTURE)
        }
    }
}
