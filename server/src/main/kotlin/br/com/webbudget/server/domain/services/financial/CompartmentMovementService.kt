package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.CompartmentMovement
import br.com.webbudget.server.domain.entities.financial.CompartmentMovement.Direction
import br.com.webbudget.server.domain.entities.financial.CompartmentMovementResult
import br.com.webbudget.server.domain.entities.financial.WalletEntry
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INSUFFICIENT_COMPARTMENT_BALANCE
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.financial.CompartmentMovementValidator
import br.com.webbudget.server.infrastructure.repository.financial.CompartmentMovementRepository
import br.com.webbudget.server.infrastructure.repository.financial.WalletEntryRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class CompartmentMovementService(
    private val walletLedger: WalletLedger,
    private val walletEntryRepository: WalletEntryRepository,
    private val compartmentMovementRepository: CompartmentMovementRepository,
    @OnCreateValidation
    private val creationValidators: List<CompartmentMovementValidator>
) {

    @Transactional
    fun move(movement: CompartmentMovement): CompartmentMovementResult {

        creationValidators.forEach { it.validate(movement) }

        val compartment = movement.compartment

        walletEntryRepository.lockWallets(listOf(compartment.wallet.id))

        val delta = if (movement.direction == Direction.DEPOSIT) movement.value else movement.value.negate()

        val resultingBalance = compartmentMovementRepository.applyBalanceDelta(compartment.id, delta)
            ?: throw DomainException(
                "The compartment does not have enough balance for the withdrawal",
                INSUFFICIENT_COMPARTMENT_BALANCE,
                mapOf("balance" to compartmentMovementRepository.findBalance(compartment.id))
            )

        movement.previousBalance = resultingBalance.subtract(delta)
        movement.resultingBalance = resultingBalance

        val created = compartmentMovementRepository.insert(movement)

        val entry: WalletEntry = walletLedger.post(
            walletId = compartment.wallet.id,
            direction = if (movement.direction == Direction.DEPOSIT) {
                WalletEntry.Direction.DEBIT
            } else {
                WalletEntry.Direction.CREDIT
            },
            origin = WalletEntry.Origin.COMPARTMENT,
            value = movement.value,
            name = compartment.name,
            compartmentMovementId = created.id
        )

        return CompartmentMovementResult(created, entry)
    }
}
