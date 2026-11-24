package br.com.webbudget.server.application.mappers.registration

import br.com.webbudget.server.application.payloads.registration.CardCreateForm
import br.com.webbudget.server.application.payloads.registration.CardListView
import br.com.webbudget.server.application.payloads.registration.CardUpdateForm
import br.com.webbudget.server.application.payloads.registration.CardView
import br.com.webbudget.server.domain.entities.registration.Card
import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.registration.WalletRepository
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class CardMapper(
    private val walletMapper: WalletMapper,
    private val walletRepository: WalletRepository
) {

    fun mapToView(card: Card): CardView = CardView(
        id = card.externalId!!,
        name = card.name,
        lastFourDigits = card.lastFourDigits,
        active = card.active,
        flag = card.flag,
        invoicePaymentDay = card.invoicePaymentDay,
        wallet = card.wallet?.let { walletMapper.mapToListView(it) }
    )

    fun mapToListView(card: Card): CardListView = CardListView(
        id = card.externalId!!,
        name = card.name,
        lastFourDigits = card.lastFourDigits,
        invoicePaymentDay = card.invoicePaymentDay,
        active = card.active,
        flag = card.flag,
        wallet = card.wallet?.let { walletMapper.mapToListView(it) }
    )

    fun mapToDomain(form: CardCreateForm): Card = Card(
        name = form.name!!,
        lastFourDigits = form.lastFourDigits!!,
        invoicePaymentDay = form.invoicePaymentDay,
        flag = form.flag,
        wallet = mapWallet(form.wallet)
    )

    fun mapToDomain(form: CardUpdateForm, card: Card): Card = card.apply {
        this.name = form.name!!
        this.lastFourDigits = form.lastFourDigits!!
        this.invoicePaymentDay = form.invoicePaymentDay
        this.active = form.active!!
        this.flag = form.flag
        this.wallet = mapWallet(form.wallet)
    }

    private fun mapWallet(id: UUID?): Wallet? = id?.let {
        walletRepository.findByExternalId(it) ?: throw ResourceNotFoundException()
    }
}
