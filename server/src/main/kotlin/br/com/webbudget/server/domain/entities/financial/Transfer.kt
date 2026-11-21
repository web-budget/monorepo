package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.util.UUID

class Transfer(
    val fromWallet: WalletReference,
    val toWallet: WalletReference,
    val value: BigDecimal,
    val description: String? = null,
    val returnedTransferId: Long? = null,
    val returnedTransferExternalId: UUID? = null,
    var returned: Boolean = false
) : PersistentEntity() {

    fun returnTransfer(): Transfer = Transfer(
        fromWallet = toWallet,
        toWallet = fromWallet,
        value = value,
        description = description,
        returnedTransferId = id,
        returnedTransferExternalId = externalId
    )
}

class WalletAdjustment(
    val wallet: WalletReference,
    val value: BigDecimal,
    val name: String
)
