package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.ReconciliationResult
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Direction
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Origin
import br.com.webbudget.server.domain.entities.financial.WalletReconciliation
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.financial.WalletReconciliationValidator
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.WalletEntryRepository
import br.com.webbudget.server.infrastructure.repository.financial.WalletReconciliationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class WalletReconciliationService(
    private val walletLedger: WalletLedger,
    private val walletEntryRepository: WalletEntryRepository,
    private val movementReferenceRepository: MovementReferenceRepository,
    private val walletReconciliationRepository: WalletReconciliationRepository,
    @OnCreateValidation
    private val creationValidators: List<WalletReconciliationValidator>
) {

    @Transactional
    fun reconcile(request: WalletReconciliation): ReconciliationResult {

        walletEntryRepository.lockWallets(listOf(request.wallet.id))

        val current = movementReferenceRepository.findWallet(request.wallet.externalId)
            ?: throw ResourceNotFoundException()

        val balances = movementReferenceRepository.findWalletBalances(current.id)

        val reconciliation = request.withBalances(current, balances)

        creationValidators.forEach { it.validate(reconciliation) }

        val difference = reconciliation.difference

        val entry = walletLedger.post(
            walletId = current.id,
            direction = if (difference.signum() > 0) Direction.CREDIT else Direction.DEBIT,
            origin = Origin.ADJUSTMENT,
            value = difference.abs(),
            name = reconciliation.reason
        )

        return ReconciliationResult(walletReconciliationRepository.insert(reconciliation, entry), entry)
    }
}
