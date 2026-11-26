package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.text.Normalizer
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

class Import(
    val financialPeriod: FinancialPeriodReference,
    val card: CardReference?,
    val wallet: WalletReference?,
    val fileName: String,
    var fileType: OfxStatementType? = null,
    var startingOn: LocalDate? = null,
    var endingOn: LocalDate? = null,
    var ledgerBalance: BigDecimal? = null,
    var ledgerBalanceOn: LocalDate? = null,
    var status: Status = Status.PROCESSING,
    var error: String? = null,
    var savedOn: LocalDateTime? = null,
    var undoneOn: LocalDateTime? = null
) : PersistentEntity() {

    val target: Target
        get() = if (card != null) Target.CARD else Target.WALLET

    val isCard: Boolean
        get() = target == Target.CARD

    val expectedFileType: OfxStatementType
        get() = if (isCard) OfxStatementType.CREDIT_CARD else OfxStatementType.BANK_ACCOUNT

    enum class Target { CARD, WALLET }

    enum class Status { PROCESSING, READY, FAILED, SAVED, UNDONE }
}

enum class ImportAction {
    CREATE,
    LINK,
    LAUNCH_RECURRING,
    CREATE_RECURRING,
    INVOICE_PAYMENT,
    TRANSFER,
    IGNORE
}

enum class ImportCandidateKind { MOVEMENT, PURCHASE, TRANSFER, RECURRING }

class ImportCandidate(
    val kind: ImportCandidateKind,
    val id: Long,
    val externalId: UUID,
    val name: String,
    val value: BigDecimal,
    val date: LocalDate? = null,
    val financialPeriod: FinancialPeriodReference? = null,
    val costCenter: CostCenterReference? = null,
    val classification: ClassificationReference? = null,
    val movementType: Movement.Type? = null,
    val invoicePayment: Boolean = false,
    val recurringId: Long? = null,
    val recurringCardId: Long? = null,
    val installment: Int? = null,
    val installments: Int? = null,
    val fromWalletId: Long? = null,
    val toWalletId: Long? = null
)

class ImportLine(
    val import: Import,
    val position: Int,
    val postedOn: LocalDate,
    val value: BigDecimal,
    val fitId: String,
    val description: String,
    var name: String,
    var installment: Int?,
    var installments: Int?,
    val kind: OfxTransactionKind,
    var action: ImportAction = ImportAction.CREATE,
    var alreadyImported: Boolean = false,
    var alreadyRegistered: Boolean = false,
    var fromMemory: Boolean = false,
    var differentValue: Boolean = false,
    var costCenter: CostCenterReference? = null,
    var classification: ClassificationReference? = null,
    var targetWallet: WalletReference? = null,
    var link: ImportCandidate? = null,
    var createdMovementId: Long? = null,
    var createdPurchaseId: Long? = null,
    var createdTransferId: Long? = null,
    var createdRecurringId: Long? = null,
    var previousValue: BigDecimal? = null,
    var ignoreReason: String? = null,
    var ignoreReasonOn: LocalDate? = null,
    var created: List<ImportCandidate> = emptyList()
) : PersistentEntity() {

    val isCredit: Boolean
        get() = value.signum() > 0

    val absoluteValue: BigDecimal
        get() = value.abs()

    fun pendingReasons(): List<String> = when (action) {
        ImportAction.CREATE -> classificationReasons()
        ImportAction.CREATE_RECURRING -> classificationReasons() + if (installments == null) listOf(INSTALLMENTS) else emptyList()
        ImportAction.LINK, ImportAction.INVOICE_PAYMENT, ImportAction.LAUNCH_RECURRING ->
            if (link == null) listOf(LINK) else emptyList()
        ImportAction.TRANSFER -> if (targetWallet == null) listOf(WALLET) else emptyList()
        ImportAction.IGNORE -> emptyList()
    }

    fun allowedActions(): Set<ImportAction> = when {
        import.isCard && isCredit -> setOf(ImportAction.IGNORE)
        import.isCard -> setOf(
            ImportAction.CREATE,
            ImportAction.LINK,
            ImportAction.LAUNCH_RECURRING,
            ImportAction.CREATE_RECURRING,
            ImportAction.IGNORE
        )
        isCredit -> setOf(ImportAction.CREATE, ImportAction.LINK, ImportAction.IGNORE)
        else -> setOf(
            ImportAction.CREATE,
            ImportAction.LINK,
            ImportAction.INVOICE_PAYMENT,
            ImportAction.TRANSFER,
            ImportAction.IGNORE
        )
    }

    fun refreshDifferentValue() {
        differentValue = isLinkedToValue() && link!!.value.compareTo(absoluteValue) != 0
    }

    fun clearAction() {
        targetWallet = null
        link = null
        differentValue = false
    }

    private fun isLinkedToValue(): Boolean =
        link != null && (action == ImportAction.LINK || action == ImportAction.INVOICE_PAYMENT)

    private fun classificationReasons(): List<String> =
        listOfNotNull(
            if (costCenter == null) COST_CENTER else null,
            if (classification == null) CLASSIFICATION else null
        )

    companion object {
        const val COST_CENTER = "cost-center"
        const val CLASSIFICATION = "classification"
        const val LINK = "link"
        const val WALLET = "wallet"
        const val INSTALLMENTS = "installments"
        const val PAYMENT_RECEIVED = "payment-received"
        const val IOF_PAIR = "iof-pair"
        const val CREDIT = "credit"
        const val ALREADY_IMPORTED = "already-imported"
        const val ALREADY_REGISTERED = "already-registered"
    }
}

class ImportNameMemory(
    val target: Import.Target,
    val normalizedName: String,
    var action: ImportAction,
    var costCenter: CostCenterReference?,
    var classification: ClassificationReference?,
    var wallet: WalletReference?,
    var recurringId: Long?
) : PersistentEntity() {

    companion object {

        private val DIACRITICS = Regex("\\p{M}+")
        private val NON_ALPHANUMERIC = Regex("[^a-z0-9]+")

        fun normalize(name: String): String = Normalizer.normalize(name, Normalizer.Form.NFD)
            .replace(DIACRITICS, "")
            .lowercase()
            .replace(NON_ALPHANUMERIC, " ")
            .trim()
            .take(MAX_LENGTH)

        private const val MAX_LENGTH = 150
    }
}

class ImportTotals(
    val lines: Int,
    val pending: Int,
    val ignored: Int,
    val byAction: Map<ImportAction, Int>
)

class ImportedLine(
    val fitId: String,
    val value: BigDecimal,
    val description: String,
    val postedOn: LocalDate,
    val name: String,
    val importedOn: LocalDate?
)

class ImportSuggestionContext(
    val importedBefore: List<ImportedLine>,
    val memories: Map<String, ImportNameMemory>,
    val movements: List<ImportCandidate>,
    val purchases: List<ImportCandidate>,
    val invoicePayments: List<ImportCandidate>,
    val transfers: List<ImportCandidate>,
    val recurringMovements: List<ImportCandidate>
)

class ImportSummary(
    val totals: ImportTotals,
    val unlinkedRecurring: List<ImportCandidate>,
    val fileTotal: BigDecimal?,
    val afterSave: BigDecimal,
    val ledgerBalance: BigDecimal?,
    val currentBalance: BigDecimal?,
    val ignoredCredits: BigDecimal
)

class ImportLinkReference(
    val kind: ImportCandidateKind,
    val externalId: UUID
)

class ImportLineChange(
    val name: String? = null,
    val action: ImportAction? = null,
    val costCenter: CostCenterReference? = null,
    val classification: ClassificationReference? = null,
    val wallet: WalletReference? = null,
    val link: ImportLinkReference? = null,
    val installment: Int? = null,
    val installments: Int? = null
)
