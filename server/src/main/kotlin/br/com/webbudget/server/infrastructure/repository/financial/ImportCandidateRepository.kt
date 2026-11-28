package br.com.webbudget.server.infrastructure.repository.financial

import br.com.webbudget.server.domain.entities.financial.ImportCandidate
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.jooq.financial.tables.references.CARD_PURCHASES
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_LAUNCHES
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.TRANSFERS
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COMPARTMENTS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.UUID

@Repository
class ImportCandidateRepository(
    private val dsl: DSLContext,
    private val recurringMovementRepository: RecurringMovementRepository
) {

    private val movements = MOVEMENTS.`as`("movements")
    private val financialPeriods = FINANCIAL_PERIODS.`as`("financial_periods")
    private val classifications = CLASSIFICATIONS.`as`("classifications")
    private val costCenters = COST_CENTERS.`as`("cost_centers")
    private val recurringLaunches = RECURRING_LAUNCHES.`as`("recurring_launches")
    private val recurringMovements = RECURRING_MOVEMENTS.`as`("recurring_movements")
    private val purchases = CARD_PURCHASES.`as`("card_purchases")
    private val invoices = INVOICES.`as`("invoices")
    private val transfers = TRANSFERS.`as`("transfers")
    private val fromWallets = WALLETS.`as`("from_wallets")
    private val toWallets = WALLETS.`as`("to_wallets")
    private val compartments = COMPARTMENTS.`as`("compartments")

    fun findOpenMovements(financialPeriodId: Long?, type: Movement.Type): List<ImportCandidate> = selectMovements(
        DSL.and(
            movements.STATUS.eq(Movement.Status.OPEN.name),
            movements.ID_INVOICE.isNull,
            movements.TYPE.eq(type.name),
            financialPeriods.STATUS.eq(FinancialPeriodReference.Status.OPEN.name),
            financialPeriodId?.let { movements.ID_FINANCIAL_PERIOD.eq(it) } ?: DSL.noCondition()
        )
    )

    fun findOpenInvoicePayments(): List<ImportCandidate> = selectMovements(
        DSL.and(
            movements.STATUS.eq(Movement.Status.OPEN.name),
            movements.ID_INVOICE.isNotNull,
            financialPeriods.STATUS.eq(FinancialPeriodReference.Status.OPEN.name)
        )
    )

    fun findMovements(ids: Collection<Long>): List<ImportCandidate> = selectMovements(movements.ID.`in`(ids))

    fun findLoosePurchases(cardId: Long, financialPeriodId: Long): List<ImportCandidate> = selectPurchases(
        DSL.and(
            purchases.ID_MOVEMENT.isNull,
            invoices.ID_CARD.eq(cardId),
            invoices.ID_FINANCIAL_PERIOD.eq(financialPeriodId)
        )
    )

    fun findPurchases(ids: Collection<Long>): List<ImportCandidate> = selectPurchases(purchases.ID.`in`(ids))

    fun findTransfers(walletId: Long, from: LocalDate, to: LocalDate): List<ImportCandidate> = selectTransfers(
        DSL.and(
            transfers.ID_FROM_WALLET.eq(walletId).or(transfers.ID_TO_WALLET.eq(walletId)),
            transfers.CREATED_ON.ge(from.atStartOfDay()),
            transfers.CREATED_ON.lt(to.plusDays(1).atStartOfDay())
        )
    )

    fun findTransfers(ids: Collection<Long>): List<ImportCandidate> = selectTransfers(transfers.ID.`in`(ids))

    fun findRecurringMovements(ids: Collection<Long>): List<ImportCandidate> =
        recurringMovementRepository.findByIds(ids).map { it.toCandidate() }

    fun findLaunchableRecurringMovements(cardExternalId: UUID, financialPeriodExternalId: UUID): List<ImportCandidate> =
        recurringMovementRepository.findAll(
            RecurringMovementCriteria(
                cards = listOf(cardExternalId),
                active = true,
                ended = false,
                financialPeriod = financialPeriodExternalId
            ),
            PageRequest.of(0, MAX_RECURRING)
        ).content
            .filter { it.launchedInPeriod == null }
            .map { it.toCandidate() }

    fun findCompartments(walletId: Long): List<ImportCandidate> = dsl.selectFrom(compartments)
        .where(compartments.ID_WALLET.eq(walletId))
        .orderBy(compartments.CREATED_ON.asc(), compartments.ID.asc())
        .fetch { record ->
            ImportCandidate(
                kind = ImportCandidateKind.COMPARTMENT,
                id = record.id!!,
                externalId = record.externalId!!,
                name = record.name!!,
                value = record.balance!!
            )
        }

    private fun RecurringMovement.toCandidate() = ImportCandidate(
        kind = ImportCandidateKind.RECURRING,
        id = id!!,
        externalId = externalId!!,
        name = name,
        value = launchValue,
        costCenter = costCenter,
        classification = classification,
        movementType = type,
        recurringId = id,
        recurringCardId = card?.id,
        installment = nextInstallment,
        installments = installments
    )

    private fun selectMovements(condition: Condition): List<ImportCandidate> = dsl.select().from(movements)
        .join(financialPeriods).on(financialPeriods.ID.eq(movements.ID_FINANCIAL_PERIOD))
        .leftJoin(classifications).on(classifications.ID.eq(movements.ID_CLASSIFICATION))
        .leftJoin(costCenters).on(costCenters.ID.eq(movements.ID_COST_CENTER))
        .leftJoin(recurringLaunches).on(recurringLaunches.ID_MOVEMENT.eq(movements.ID))
        .leftJoin(recurringMovements).on(recurringMovements.ID.eq(recurringLaunches.ID_RECURRING_MOVEMENT))
        .where(condition)
        .orderBy(movements.DUE_DATE, movements.NAME, movements.ID)
        .fetch { record -> record.toMovementCandidate() }

    private fun selectPurchases(condition: Condition): List<ImportCandidate> = dsl.select().from(purchases)
        .join(invoices).on(invoices.ID.eq(purchases.ID_INVOICE))
        .join(financialPeriods).on(financialPeriods.ID.eq(invoices.ID_FINANCIAL_PERIOD))
        .join(classifications).on(classifications.ID.eq(purchases.ID_CLASSIFICATION))
        .join(costCenters).on(costCenters.ID.eq(purchases.ID_COST_CENTER))
        .where(condition)
        .orderBy(purchases.PURCHASED_ON, purchases.NAME, purchases.ID)
        .fetch { record -> record.toPurchaseCandidate() }

    private fun selectTransfers(condition: Condition): List<ImportCandidate> = dsl.select().from(transfers)
        .join(fromWallets).on(fromWallets.ID.eq(transfers.ID_FROM_WALLET))
        .join(toWallets).on(toWallets.ID.eq(transfers.ID_TO_WALLET))
        .where(condition)
        .orderBy(transfers.CREATED_ON, transfers.ID)
        .fetch { record -> record.toTransferCandidate() }

    private fun Record.toMovementCandidate(): ImportCandidate {

        val movementRecord = into(movements)
        val classificationRecord = into(classifications)
        val costCenterRecord = into(costCenters)
        val launchRecord = into(recurringLaunches)
        val recurringRecord = into(recurringMovements)

        return ImportCandidate(
            kind = ImportCandidateKind.MOVEMENT,
            id = movementRecord.id!!,
            externalId = movementRecord.externalId!!,
            name = movementRecord.name!!,
            value = movementRecord.value!!,
            date = movementRecord.dueDate,
            financialPeriod = into(financialPeriods).toFinancialPeriodReference(),
            costCenter = costCenterRecord.id?.let { costCenterRecord.toCostCenterReference() },
            classification = classificationRecord.id?.let { classificationRecord.toClassificationReference() },
            movementType = Movement.Type.valueOf(movementRecord.type!!),
            invoicePayment = movementRecord.idInvoice != null,
            recurringId = recurringRecord.id,
            recurringCardId = recurringRecord.idCard,
            installment = launchRecord.installment,
            installments = recurringRecord.installments
        )
    }

    private fun Record.toPurchaseCandidate(): ImportCandidate {

        val purchaseRecord = into(purchases)

        return ImportCandidate(
            kind = ImportCandidateKind.PURCHASE,
            id = purchaseRecord.id!!,
            externalId = purchaseRecord.externalId!!,
            name = purchaseRecord.name!!,
            value = purchaseRecord.value!!,
            date = purchaseRecord.purchasedOn,
            financialPeriod = into(financialPeriods).toFinancialPeriodReference(),
            costCenter = into(costCenters).toCostCenterReference(),
            classification = into(classifications).toClassificationReference(),
            movementType = Movement.Type.EXPENSE
        )
    }

    private fun Record.toTransferCandidate(): ImportCandidate {

        val transferRecord = into(transfers)

        return ImportCandidate(
            kind = ImportCandidateKind.TRANSFER,
            id = transferRecord.id!!,
            externalId = transferRecord.externalId!!,
            name = transferRecord.description ?: "${into(fromWallets).name} → ${into(toWallets).name}",
            value = transferRecord.value!!,
            date = transferRecord.createdOn!!.toLocalDate(),
            fromWalletId = transferRecord.idFromWallet,
            toWalletId = transferRecord.idToWallet
        )
    }

    companion object {
        private const val MAX_RECURRING = 500
    }
}
