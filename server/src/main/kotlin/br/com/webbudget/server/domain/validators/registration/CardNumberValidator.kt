package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.Card
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.registration.CardRepository
import org.springframework.stereotype.Component

@Component
@OnCreateValidation
@OnUpdateValidation
class CardNumberValidator(
    private val cardRepository: CardRepository
) : CardValidator {

    override fun validate(value: Card) {
        if (cardRepository.existsByLastFourDigits(value.lastFourDigits, value.externalId)) {
            throw DomainException.conflict(
                parameters = mapOf("card.last-four-digits" to value.lastFourDigits)
            )
        }
    }
}
