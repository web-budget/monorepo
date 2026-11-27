package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.Transfer
import br.com.webbudget.server.domain.entities.financial.TransferLink
import br.com.webbudget.server.infrastructure.repository.containsIgnoringAccents
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.TRANSFERS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.SelectOnConditionStep
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Repository
class TransferRepository(
    private val dsl: DSLContext
) {

    private val transfers = TRANSFERS.`as`("transfers")
    private val originalTransfers = TRANSFERS.`as`("original_transfers")
    private val returnTransfers = TRANSFERS.`as`("return_transfers")
    private val fromWallets = WALLETS.`as`("from_wallets")
    private val toWallets = WALLETS.`as`("to_wallets")

    fun findByExternalId(externalId: UUID): Transfer? = selectTransfers()
        .where(transfers.EXTERNAL_ID.eq(externalId))
        .fetchOne()
        ?.toTransfer()

    fun findById(id: Long): Transfer? = selectTransfers()
        .where(transfers.ID.eq(id))
        .fetchOne()
        ?.toTransfer()

    fun findAll(criteria: TransferCriteria, pageable: Pageable): PagedModel<Transfer> {

        val condition = DSL.and(
            listOfNotNull(
                criteria.wallet?.let { fromWallets.EXTERNAL_ID.eq(it).or(toWallets.EXTERNAL_ID.eq(it)) },
                criteria.from?.let { transfers.CREATED_ON.ge(it.atStartOfDay()) },
                criteria.to?.let { transfers.CREATED_ON.lt(it.plusDays(1).atStartOfDay()) },
                criteria.text?.let { text ->
                    transfers.DESCRIPTION.containsIgnoringAccents(text)
                        .or(fromWallets.NAME.containsIgnoringAccents(text))
                        .or(toWallets.NAME.containsIgnoringAccents(text))
                }
            )
        )

        val sortable = mapOf(
            "createdOn" to transfers.CREATED_ON,
            "value" to transfers.VALUE,
            "fromWallet" to fromWallets.NAME,
            "toWallet" to toWallets.NAME
        )

        val content = selectTransfers()
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, transfers.CREATED_ON, transfers.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch()
            .map { record -> record.toTransfer() }

        val total = dsl.fetchCount(
            dsl.selectOne().from(transfers)
                .join(fromWallets).on(fromWallets.ID.eq(transfers.ID_FROM_WALLET))
                .join(toWallets).on(toWallets.ID.eq(transfers.ID_TO_WALLET))
                .where(condition)
        )

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun existsReturnOf(transferId: Long): Boolean = dsl.fetchExists(
        dsl.selectOne().from(TRANSFERS).where(TRANSFERS.ID_RETURNED_TRANSFER.eq(transferId))
    )

    fun isReturn(transferId: Long): Boolean = dsl.fetchExists(
        dsl.selectOne().from(TRANSFERS)
            .where(TRANSFERS.ID.eq(transferId))
            .and(TRANSFERS.ID_RETURNED_TRANSFER.isNotNull)
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

    private fun selectTransfers(): SelectOnConditionStep<Record> = dsl.select()
        .from(transfers)
        .join(fromWallets).on(fromWallets.ID.eq(transfers.ID_FROM_WALLET))
        .join(toWallets).on(toWallets.ID.eq(transfers.ID_TO_WALLET))
        .leftJoin(originalTransfers).on(originalTransfers.ID.eq(transfers.ID_RETURNED_TRANSFER))
        .leftJoin(returnTransfers).on(returnTransfers.ID_RETURNED_TRANSFER.eq(transfers.ID))

    private fun Record.toTransfer(): Transfer {

        val transferRecord = into(transfers)
        val original = into(originalTransfers)
        val returning = into(returnTransfers)

        return Transfer(
            fromWallet = into(fromWallets).toWalletReference(),
            toWallet = into(toWallets).toWalletReference(),
            value = transferRecord.value!!,
            description = transferRecord.description,
            returnedTransferId = transferRecord.idReturnedTransfer,
            returnedTransferExternalId = original.externalId,
            returnedTransferCreatedOn = original.createdOn,
            returnedBy = returning.externalId?.let { TransferLink(it, returning.createdOn!!) }
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
}

data class TransferCriteria(
    val wallet: UUID? = null,
    val from: LocalDate? = null,
    val to: LocalDate? = null,
    val text: String? = null
)
