package br.com.webbudget.server.application.payloads.financial

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_EMPTY
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

data class ImportCreatedView(
    val id: UUID
)

data class ImportListView(
    val id: UUID,
    val fileName: String,
    val target: String,
    val card: PaymentCardView?,
    val wallet: PaymentWalletView?,
    val financialPeriod: MovementFinancialPeriodView,
    val status: String,
    val error: String?,
    val lines: Int,
    val pending: Int,
    val createdOn: LocalDateTime,
    val savedOn: LocalDateTime?,
    val undoneOn: LocalDateTime?
)

data class ImportCountsView(
    val processing: Int,
    val ready: Int,
    val failed: Int,
    val saved: Int,
    val undone: Int,
    val total: Int
)

data class ImportLineTotalsView(
    val lines: Int,
    val pending: Int,
    val ignored: Int,
    val byAction: Map<ImportAction, Int>
)

data class ImportResultView(
    val created: Int,
    val linked: Int,
    val recurring: Int,
    val transfers: Int,
    val ignored: Int
)

data class ImportCandidateView(
    val kind: ImportCandidateKind,
    val id: UUID,
    val name: String,
    val value: BigDecimal,
    val date: LocalDate?,
    val financialPeriod: MovementFinancialPeriodView?,
    val costCenter: MovementCostCenterView?,
    val classification: MovementClassificationView?,
    val recurring: Boolean,
    val installment: Int?,
    val installments: Int?
)

data class ImportBlockerView(
    val reason: String,
    val position: Int?,
    val name: String?
)

data class ImportWarningsView(
    val unlinkedRecurring: List<ImportCandidateView>,
    val fileTotal: BigDecimal?,
    val afterSave: BigDecimal,
    val ledgerBalance: BigDecimal?,
    val currentBalance: BigDecimal?,
    val ignoredCredits: BigDecimal
)

data class ImportView(
    val id: UUID,
    val fileName: String,
    val target: String,
    val card: PaymentCardView?,
    val wallet: PaymentWalletView?,
    val financialPeriod: MovementFinancialPeriodView,
    val status: String,
    val error: String?,
    val fileType: String?,
    val startingOn: LocalDate?,
    val endingOn: LocalDate?,
    val ledgerBalance: BigDecimal?,
    val ledgerBalanceOn: LocalDate?,
    val createdOn: LocalDateTime,
    val lastUpdate: LocalDateTime?,
    val savedOn: LocalDateTime?,
    val undoneOn: LocalDateTime?,
    val totals: ImportLineTotalsView,
    val result: ImportResultView,
    val warnings: ImportWarningsView,
    val undoBlockers: List<ImportBlockerView>
)

data class ImportIgnoreReasonView(
    val code: String,
    val date: LocalDate?
)

data class ImportLineView(
    val id: UUID,
    val position: Int,
    val postedOn: LocalDate,
    val value: BigDecimal,
    val description: String,
    val name: String,
    val installment: Int?,
    val installments: Int?,
    val kind: String,
    val action: ImportAction,
    val allowedActions: Set<ImportAction>,
    val alreadyImported: Boolean,
    val alreadyRegistered: Boolean,
    val fromMemory: Boolean,
    val differentValue: Boolean,
    val costCenter: MovementCostCenterView?,
    val classification: MovementClassificationView?,
    val wallet: PaymentWalletView?,
    val link: ImportCandidateView?,
    val created: List<ImportCandidateView>,
    val ignoreReason: ImportIgnoreReasonView?,
    val pending: List<String>
)

data class ImportFilter(
    val filter: String? = null,
    val statuses: List<Import.Status>? = null,
    val target: Import.Target? = null,
    val card: UUID? = null,
    val wallet: UUID? = null,
    val financialPeriod: UUID? = null
)

data class ImportLineFilter(
    val filter: String? = null,
    val pending: Boolean? = null,
    val actions: List<ImportAction>? = null
)

data class ImportLinkForm(
    @field:NotNull(message = IS_NULL)
    val kind: ImportCandidateKind?,
    @field:NotNull(message = IS_NULL)
    val id: UUID?
)

data class ImportLineUpdateForm(
    @field:Size(message = MAX_CHARS, max = 150)
    val name: String? = null,
    val action: ImportAction? = null,
    val costCenter: UUID? = null,
    val classification: UUID? = null,
    val wallet: UUID? = null,
    @field:Valid
    val link: ImportLinkForm? = null,
    val installment: Int? = null,
    val installments: Int? = null
)

data class ImportLinesBatchForm(
    @field:NotEmpty(message = IS_EMPTY)
    val lines: List<UUID>?,
    val action: ImportAction? = null,
    val costCenter: UUID? = null,
    val classification: UUID? = null
)
