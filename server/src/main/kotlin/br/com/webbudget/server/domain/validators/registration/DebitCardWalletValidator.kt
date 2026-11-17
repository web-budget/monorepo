package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.Card
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.DEBIT_CARD_WITHOUT_WALLET
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

@Component
@OnCreateValidation
@OnUpdateValidation
class DebitCardWalletValidator : CardValidator {

    override fun validate(value: Card) {
        if (value.type == Card.Type.DEBIT && value.wallet == null) {
            throw DomainException("Debit card has no wallet", DEBIT_CARD_WITHOUT_WALLET)
        }
    }
}
