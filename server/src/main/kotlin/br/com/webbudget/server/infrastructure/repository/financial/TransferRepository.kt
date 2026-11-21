package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Transfer
import br.com.webbudget.server.jooq.financial.tables.references.TRANSFERS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class TransferRepository(
    private val dsl: DSLContext
) {

    private val transfers = TRANSFERS.`as`("transfers")
    private val returnedTransfers = TRANSFERS.`as`("returned_transfers")
    private val fromWallets = WALLETS.`as`("from_wallets")
    private val toWallets = WALLETS.`as`("to_wallets")

    fun findByExternalId(externalId: UUID): Transfer? {

        val record = dsl.select()
            .from(transfers)
            .join(fromWallets).on(fromWallets.ID.eq(transfers.ID_FROM_WALLET))
            .join(toWallets).on(toWallets.ID.eq(transfers.ID_TO_WALLET))
            .leftJoin(returnedTransfers).on(returnedTransfers.ID.eq(transfers.ID_RETURNED_TRANSFER))
            .where(transfers.EXTERNAL_ID.eq(externalId))
            .fetchOne() ?: return null

        val transferRecord = record.into(transfers)

        return Transfer(
            fromWallet = record.into(fromWallets).toWalletReference(),
            toWallet = record.into(toWallets).toWalletReference(),
            value = transferRecord.value!!,
            description = transferRecord.description,
            returnedTransferId = transferRecord.idReturnedTransfer,
            returnedTransferExternalId = record.into(returnedTransfers).externalId,
            returned = existsReturnOf(transferRecord.id!!)
        ).also { transfer ->
            transfer.restore(
                transferRecord.id,
                transferRecord.externalId,
                transferRecord.version,
                transferRecord.createdOn,
                transferRecord.lastUpdate
            )
        }
    }

    fun existsReturnOf(transferId: Long): Boolean = dsl.fetchExists(
        dsl.selectOne().from(TRANSFERS).where(TRANSFERS.ID_RETURNED_TRANSFER.eq(transferId))
    )

    fun insert(transfer: Transfer): Transfer {
        val record = dsl.insertInto(TRANSFERS)
            .set(TRANSFERS.EXTERNAL_ID, UUID.randomUUID())
            .set(TRANSFERS.VERSION, 0)
            .set(TRANSFERS.CREATED_ON, LocalDateTime.now())
            .set(TRANSFERS.VALUE, transfer.value)
            .set(TRANSFERS.DESCRIPTION, transfer.description)
            .set(TRANSFERS.ID_FROM_WALLET, transfer.fromWallet.id)
            .set(TRANSFERS.ID_TO_WALLET, transfer.toWallet.id)
            .set(TRANSFERS.ID_RETURNED_TRANSFER, transfer.returnedTransferId)
            .returning()
            .fetchSingle()

        transfer.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return transfer
    }
}
