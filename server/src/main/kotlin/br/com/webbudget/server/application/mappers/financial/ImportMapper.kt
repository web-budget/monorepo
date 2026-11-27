package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.ImportCandidateView
import br.com.webbudget.server.application.payloads.financial.ImportIgnoreReasonView
import br.com.webbudget.server.application.payloads.financial.ImportLineTotalsView
import br.com.webbudget.server.application.payloads.financial.ImportLineUpdateForm
import br.com.webbudget.server.application.payloads.financial.ImportLineView
import br.com.webbudget.server.application.payloads.financial.ImportLinesBatchForm
import br.com.webbudget.server.application.payloads.financial.ImportListView
import br.com.webbudget.server.application.payloads.financial.ImportResultView
import br.com.webbudget.server.application.payloads.financial.ImportView
import br.com.webbudget.server.application.payloads.financial.ImportWarningsView
import br.com.webbudget.server.application.payloads.financial.MovementClassificationView
import br.com.webbudget.server.application.payloads.financial.MovementCostCenterView
import br.com.webbudget.server.application.payloads.financial.MovementFinancialPeriodView
import br.com.webbudget.server.application.payloads.financial.PaymentCardView
import br.com.webbudget.server.application.payloads.financial.PaymentWalletView
import br.com.webbudget.server.domain.entities.financial.ClassificationReference
import br.com.webbudget.server.domain.entities.financial.CostCenterReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportCandidate
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.ImportLineChange
import br.com.webbudget.server.domain.entities.financial.ImportLinkReference
import br.com.webbudget.server.domain.entities.financial.ImportSummary
import br.com.webbudget.server.domain.entities.financial.ImportTotals
import br.com.webbudget.server.domain.entities.financial.WalletReference
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.util.UUID

@Component
class ImportMapper(
    private val movementReferenceRepository: MovementReferenceRepository
) {

    fun mapToListView(import: Import, lines: Int, pending: Int): ImportListView = ImportListView(
        id = import.externalId!!,
        fileName = import.fileName,
        target = import.target.name,
        card = import.card?.let { PaymentCardView(it.externalId, it.name, it.lastFourDigits) },
        wallet = import.wallet?.let { PaymentWalletView(it.externalId, it.name) },
        financialPeriod = mapToPeriodView(import.financialPeriod),
        status = import.status.name,
        error = import.error,
        lines = lines,
        pending = pending,
        createdOn = import.createdOn!!,
        savedOn = import.savedOn,
        undoneOn = import.undoneOn
    )

    fun mapToView(import: Import, summary: ImportSummary): ImportView = ImportView(
        id = import.externalId!!,
        fileName = import.fileName,
        target = import.target.name,
        card = import.card?.let { PaymentCardView(it.externalId, it.name, it.lastFourDigits) },
        wallet = import.wallet?.let { PaymentWalletView(it.externalId, it.name) },
        financialPeriod = mapToPeriodView(import.financialPeriod),
        status = import.status.name,
        error = import.error,
        fileType = import.fileType?.name,
        startingOn = import.startingOn,
        endingOn = import.endingOn,
        ledgerBalance = import.ledgerBalance,
        ledgerBalanceOn = import.ledgerBalanceOn,
        createdOn = import.createdOn!!,
        lastUpdate = import.lastUpdate,
        savedOn = import.savedOn,
        undoneOn = import.undoneOn,
        totals = ImportLineTotalsView(
            summary.totals.lines,
            summary.totals.pending,
            summary.totals.ignored,
            summary.totals.byAction
        ),
        result = mapToResult(summary.totals),
        warnings = ImportWarningsView(
            unlinkedRecurring = summary.unlinkedRecurring.map { mapToCandidateView(it) },
            fileTotal = summary.fileTotal,
            afterSave = summary.afterSave,
            ledgerBalance = summary.ledgerBalance,
            currentBalance = summary.currentBalance,
            ignoredCredits = summary.ignoredCredits
        )
    )

    fun mapToLineView(line: ImportLine): ImportLineView = ImportLineView(
        id = line.externalId!!,
        position = line.position,
        postedOn = line.postedOn,
        value = line.value,
        description = line.description,
        name = line.name,
        installment = line.installment,
        installments = line.installments,
        kind = line.kind.name,
        action = line.action,
        allowedActions = line.allowedActions(),
        alreadyImported = line.alreadyImported,
        alreadyRegistered = line.alreadyRegistered,
        fromMemory = line.fromMemory,
        differentValue = line.differentValue,
        costCenter = line.costCenter?.let { mapToCostCenterView(it) },
        classification = line.classification?.let { mapToClassificationView(it) },
        wallet = line.targetWallet?.let { PaymentWalletView(it.externalId, it.name) },
        link = line.link?.let { mapToCandidateView(it) },
        created = line.created.map { mapToCandidateView(it) },
        ignoreReason = line.ignoreReason?.takeIf { line.action == ImportAction.IGNORE }
            ?.let { ImportIgnoreReasonView(it, line.ignoreReasonOn) },
        pending = line.pendingReasons()
    )

    fun mapToCandidateView(candidate: ImportCandidate): ImportCandidateView = ImportCandidateView(
        kind = candidate.kind,
        id = candidate.externalId,
        name = candidate.name,
        value = candidate.value,
        date = candidate.date,
        financialPeriod = candidate.financialPeriod?.let { mapToPeriodView(it) },
        costCenter = candidate.costCenter?.let { mapToCostCenterView(it) },
        classification = candidate.classification?.let { mapToClassificationView(it) },
        recurring = candidate.recurringId != null || candidate.kind == ImportCandidateKind.RECURRING,
        installment = candidate.installment,
        installments = candidate.installments
    )

    fun mapToChange(form: ImportLineUpdateForm): ImportLineChange = ImportLineChange(
        name = form.name,
        action = form.action,
        costCenter = form.costCenter?.let { findCostCenter(it) },
        classification = form.classification?.let { findClassification(it) },
        wallet = form.wallet?.let { findWallet(it) },
        link = form.link?.let { ImportLinkReference(it.kind!!, it.id!!) },
        installment = form.installment,
        installments = form.installments
    )

    fun mapToChange(form: ImportLinesBatchForm): ImportLineChange = ImportLineChange(
        action = form.action,
        costCenter = form.costCenter?.let { findCostCenter(it) },
        classification = form.classification?.let { findClassification(it) }
    )

    private fun mapToResult(totals: ImportTotals): ImportResultView {

        fun count(vararg actions: ImportAction) = actions.sumOf { totals.byAction[it] ?: 0 }

        return ImportResultView(
            created = count(ImportAction.CREATE),
            linked = count(ImportAction.LINK, ImportAction.INVOICE_PAYMENT),
            recurring = count(ImportAction.LAUNCH_RECURRING, ImportAction.CREATE_RECURRING),
            transfers = count(ImportAction.TRANSFER),
            ignored = count(ImportAction.IGNORE)
        )
    }

    private fun findCostCenter(id: UUID): CostCenterReference =
        movementReferenceRepository.findCostCenter(id) ?: throw ResourceNotFoundException()

    private fun findClassification(id: UUID): ClassificationReference =
        movementReferenceRepository.findClassification(id) ?: throw ResourceNotFoundException()

    private fun findWallet(id: UUID): WalletReference =
        movementReferenceRepository.findWallet(id) ?: throw ResourceNotFoundException()

    private fun mapToCostCenterView(costCenter: CostCenterReference) =
        MovementCostCenterView(costCenter.externalId, costCenter.name, costCenter.fullName)

    private fun mapToClassificationView(classification: ClassificationReference) =
        MovementClassificationView(classification.externalId, classification.name, classification.type)

    private fun mapToPeriodView(period: FinancialPeriodReference) = MovementFinancialPeriodView(
        id = period.externalId,
        name = period.name,
        status = period.status.name,
        expired = period.isExpired(LocalDate.now())
    )
}
