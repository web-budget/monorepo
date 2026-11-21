package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Transfer
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_WALLET
import br.com.webbudget.server.domain.exceptions.ErrorCodes.TRANSFER_ALREADY_RETURNED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.TRANSFER_BETWEEN_SAME_WALLET
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.infrastructure.repository.financial.TransferRepository
import org.springframework.stereotype.Component

interface TransferValidator : BusinessValidator<Transfer>

@Component
@OnCreateValidation
class TransferWalletsValidator : TransferValidator {

    override fun validate(value: Transfer) {

        if (value.fromWallet.id == value.toWallet.id) {
            throw DomainException("A transfer needs two different wallets", TRANSFER_BETWEEN_SAME_WALLET)
        }

        if (!value.fromWallet.active || !value.toWallet.active) {
            throw DomainException("Both wallets of a transfer must be active", INACTIVE_WALLET)
        }
    }
}

@Component
@OnCreateValidation
class TransferNotReturnedValidator(
    private val transferRepository: TransferRepository
) : TransferValidator {

    override fun validate(value: Transfer) {

        val returnedTransferId = value.returnedTransferId ?: return

        if (transferRepository.existsReturnOf(returnedTransferId)) {
            throw DomainException.conflict(
                parameters = mapOf("transfer" to value.returnedTransferExternalId),
                message = "The transfer was already returned",
                error = TRANSFER_ALREADY_RETURNED
            )
        }
    }
}
