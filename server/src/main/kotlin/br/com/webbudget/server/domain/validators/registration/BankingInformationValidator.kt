package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.registration.WalletRepository
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
@OnCreateValidation
class BankingInformationValidator(
    private val walletRepository: WalletRepository
) : WalletValidator {

    override fun validate(value: Wallet) {

        if (!value.hasValidBankInformation()) {
            return
        }

        if (walletRepository.existsByBankInfo(value.bank, value.agency, value.number, value.externalId)) {
            throw DomainException.conflict(
                parameters = mapOf(
                    "wallet.bank" to value.bank,
                    "wallet.agency" to value.agency,
                    "wallet.number" to value.number
                )
            )
        }
    }
}
