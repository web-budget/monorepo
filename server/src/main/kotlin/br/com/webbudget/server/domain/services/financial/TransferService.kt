package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Transfer
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Direction
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Origin
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.financial.TransferValidator
import br.com.webbudget.server.infrastructure.repository.financial.TransferRepository
import br.com.webbudget.server.infrastructure.repository.financial.WalletEntryRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class TransferService(
    private val walletLedger: WalletLedger,
    private val transferRepository: TransferRepository,
    private val walletEntryRepository: WalletEntryRepository,
    @OnCreateValidation
    private val creationValidators: List<TransferValidator>
) {

    @Transactional
    fun transfer(transfer: Transfer): UUID {

        creationValidators.forEach { it.validate(transfer) }

        walletEntryRepository.lockWallets(listOf(transfer.fromWallet.id, transfer.toWallet.id).sorted())

        val created = transferRepository.insert(transfer)

        walletLedger.post(
            walletId = transfer.fromWallet.id,
            direction = Direction.DEBIT,
            origin = Origin.TRANSFER,
            value = transfer.value,
            name = transfer.toWallet.name,
            transferId = created.id
        )

        walletLedger.post(
            walletId = transfer.toWallet.id,
            direction = Direction.CREDIT,
            origin = Origin.TRANSFER,
            value = transfer.value,
            name = transfer.fromWallet.name,
            transferId = created.id
        )

        return created.externalId!!
    }

    @Transactional
    fun returnTransfer(original: Transfer): UUID = transfer(original.returnTransfer())
}
