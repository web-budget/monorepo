package br.com.webbudget.server.domain.services.registration

import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.registration.WalletValidator
import br.com.webbudget.server.infrastructure.repository.registration.WalletRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class WalletService(
    private val walletRepository: WalletRepository,
    @OnCreateValidation
    private val creationValidators: List<WalletValidator>,
    @OnUpdateValidation
    private val updateValidators: List<WalletValidator>
) {

    @Transactional
    fun create(wallet: Wallet): UUID {

        creationValidators.forEach { it.validate(wallet) }

        return walletRepository.insert(wallet).externalId!!
    }

    @Transactional
    fun update(wallet: Wallet): Wallet {

        updateValidators.forEach { it.validate(wallet) }

        return walletRepository.update(wallet)
    }

    @Transactional
    fun delete(wallet: Wallet) {
        walletRepository.delete(wallet)
    }
}
