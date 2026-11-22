package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

class Transfer(
    val fromWallet: WalletReference,
    val toWallet: WalletReference,
    val value: BigDecimal,
    val description: String? = null,
    val returnedTransferId: Long? = null,
    val returnedTransferExternalId: UUID? = null,
    val returnedTransferCreatedOn: LocalDateTime? = null,
    val returnedBy: TransferLink? = null
) : PersistentEntity() {

    val returned: Boolean
        get() = returnedBy != null

    val isReturn: Boolean
        get() = returnedTransferId != null

    val returnable: Boolean
        get() = !returned && !isReturn

    fun returnTransfer(): Transfer = Transfer(
        fromWallet = toWallet,
        toWallet = fromWallet,
        value = value,
        description = description,
        returnedTransferId = id,
        returnedTransferExternalId = externalId
    )
}

class TransferLink(
    val externalId: UUID,
    val createdOn: LocalDateTime
)

class WalletAdjustment(
    val wallet: WalletReference,
    val value: BigDecimal,
    val name: String
)
