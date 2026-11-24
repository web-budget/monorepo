package br.com.webbudget.server.domain.services.registration

import br.com.webbudget.server.domain.entities.registration.Card
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.registration.CardValidator
import br.com.webbudget.server.infrastructure.repository.registration.CardRepository
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

data class CardSaved(val cardId: Long, val active: Boolean)

@Service
@Transactional(readOnly = true)
class CardService(
    private val cardRepository: CardRepository,
    private val eventPublisher: ApplicationEventPublisher,
    @OnCreateValidation
    private val creationValidators: List<CardValidator>,
    @OnUpdateValidation
    private val updateValidators: List<CardValidator>
) {

    @Transactional
    fun create(card: Card): UUID {

        creationValidators.forEach { it.validate(card) }

        val created = cardRepository.insert(card)

        eventPublisher.publishEvent(CardSaved(created.id!!, created.active))

        return created.externalId!!
    }

    @Transactional
    fun update(card: Card): Card {

        updateValidators.forEach { it.validate(card) }

        val updated = cardRepository.update(card)

        eventPublisher.publishEvent(CardSaved(updated.id!!, updated.active))

        return updated
    }

    @Transactional
    fun delete(card: Card) {
        cardRepository.delete(card)
    }
}
