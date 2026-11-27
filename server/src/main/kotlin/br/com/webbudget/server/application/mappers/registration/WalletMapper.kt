package br.com.webbudget.server.application.mappers.registration

import br.com.webbudget.server.application.payloads.registration.LastReconciliationView
import br.com.webbudget.server.application.payloads.registration.WalletCreateForm
import br.com.webbudget.server.application.payloads.registration.WalletListView
import br.com.webbudget.server.application.payloads.registration.WalletUpdateForm
import br.com.webbudget.server.application.payloads.registration.WalletView
import br.com.webbudget.server.domain.entities.registration.Wallet
import org.springframework.stereotype.Component

@Component
class WalletMapper {

    fun mapToView(wallet: Wallet): WalletView = WalletView(
        id = wallet.externalId!!,
        name = wallet.name,
        type = wallet.type,
        bank = wallet.bank,
        agency = wallet.agency,
        number = wallet.number,
        description = wallet.description,
        active = wallet.active,
        currentBalance = wallet.currentBalance,
        totalBalance = wallet.totalBalance,
        compartmentCount = wallet.compartmentCount,
        lastEntryOn = wallet.lastEntryOn,
        lastReconciliation = wallet.lastReconciliation?.let {
            LastReconciliationView(it.externalId, it.createdOn, it.difference)
        }
    )

    fun mapToListView(wallet: Wallet): WalletListView = WalletListView(
        id = wallet.externalId!!,
        name = wallet.name,
        type = wallet.type,
        currentBalance = wallet.currentBalance,
        totalBalance = wallet.totalBalance,
        compartmentCount = wallet.compartmentCount,
        bank = wallet.bank,
        agency = wallet.agency,
        number = wallet.number,
        active = wallet.active,
        lastEntryOn = wallet.lastEntryOn
    )

    fun mapToDomain(form: WalletCreateForm): Wallet = Wallet(
        name = form.name!!,
        type = form.type!!,
        description = form.description,
        bank = form.bank,
        agency = form.agency,
        number = form.number
    )

    fun mapToDomain(form: WalletUpdateForm, wallet: Wallet): Wallet = wallet.apply {
        this.name = form.name!!
        this.active = form.active!!
        this.description = form.description
        this.bank = form.bank
        this.agency = form.agency
        this.number = form.number
    }
}
