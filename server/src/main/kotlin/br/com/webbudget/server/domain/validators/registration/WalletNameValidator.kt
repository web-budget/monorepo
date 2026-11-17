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
class WalletNameValidator(
    private val walletRepository: WalletRepository
) : WalletValidator {

    override fun validate(value: Wallet) {
        val conflicting = if (value.isSaved()) {
            walletRepository.existsByNameAndExternalIdNot(value.name, value.externalId!!)
        } else {
            walletRepository.existsByName(value.name)
        }

        if (conflicting) {
            throw DomainException.conflict(parameters = mapOf("wallet.name" to value.name))
        }
    }
}
