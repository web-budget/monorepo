package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.WALLET_HAS_ENTRIES
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.infrastructure.repository.financial.WalletEntryRepository
import org.springframework.stereotype.Component

@Component
@OnDeleteValidation
class WalletEntriesValidator(
    private val walletEntryRepository: WalletEntryRepository
) : WalletValidator {

    override fun validate(value: Wallet) {
        if (walletEntryRepository.existsByWallet(value.id!!)) {
            throw DomainException("A wallet with entries in its statement can not be deleted", WALLET_HAS_ENTRIES)
        }
    }
}
