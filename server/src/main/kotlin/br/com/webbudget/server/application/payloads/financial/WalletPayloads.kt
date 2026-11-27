package br.com.webbudget.server.application.payloads.financial

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NOT_POSITIVE
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_OUT_OF_RANGE
import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.domain.entities.financial.WalletEntry
import jakarta.validation.constraints.Digits
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import org.springframework.format.annotation.DateTimeFormat
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

data class StatementFilter(
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val from: LocalDate? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val to: LocalDate? = null,
    val financialPeriod: UUID? = null,
    val origins: List<WalletEntry.Origin>? = null,
    val direction: WalletEntry.Direction? = null,
    val filter: String? = null,
    val minValue: BigDecimal? = null,
    val maxValue: BigDecimal? = null
)

data class StatementEntryPeriodView(
    val id: UUID,
    val name: String
)

data class StatementEntryReferenceView(
    val type: String,
    val id: UUID,
    val returnTransfer: Boolean? = null,
    val returnable: Boolean? = null,
    val movementId: UUID? = null
)

data class StatementEntryCompartmentView(
    val id: UUID,
    val name: String,
    val movementId: UUID,
    val direction: String,
    val note: String? = null
)

data class StatementEntryWalletView(
    val id: UUID,
    val name: String
)

data class StatementTotalView(
    val total: BigDecimal,
    val count: Int
)

data class StatementSummaryView(
    val credits: StatementTotalView,
    val debits: StatementTotalView,
    val lastEntryOn: LocalDateTime?
)

data class WalletEntryView(
    val id: UUID,
    val createdOn: LocalDateTime,
    val name: String,
    val direction: String,
    val origin: String,
    val value: BigDecimal,
    val previousBalance: BigDecimal,
    val resultingBalance: BigDecimal,
    val financialPeriod: StatementEntryPeriodView?,
    val reference: StatementEntryReferenceView?,
    val wallet: StatementEntryWalletView? = null,
    val compartment: StatementEntryCompartmentView? = null,
    val reconciliation: ReconciliationView? = null
)

data class ReconciliationForm(
    @field:NotNull(message = IS_NULL)
    @field:Digits(integer = 13, fraction = 10, message = IS_OUT_OF_RANGE)
    val informedBalance: BigDecimal?,
    @field:NotNull(message = IS_NULL)
    @field:Digits(integer = 13, fraction = 10, message = IS_OUT_OF_RANGE)
    val shownBalance: BigDecimal?,
    val reason: String? = null
)

data class ReconciliationView(
    val id: UUID,
    val createdOn: LocalDateTime,
    val informedBalance: BigDecimal,
    val walletBalance: BigDecimal,
    val difference: BigDecimal,
    val reason: String,
    val entryId: UUID
)

data class ReconciliationResultView(
    val reconciliation: ReconciliationView,
    val entry: WalletEntryView
)

data class ReconciliationPositionView(
    val position: Long
)

data class TransferForm(
    @field:NotNull(message = IS_NULL)
    val fromWallet: UUID?,
    @field:NotNull(message = IS_NULL)
    val toWallet: UUID?,
    @field:NotNull(message = IS_NULL)
    @field:Positive(message = IS_NOT_POSITIVE)
    val value: BigDecimal?,
    val description: String?
)

data class TransferWalletView(
    val id: UUID,
    val name: String
)

data class TransferView(
    val id: UUID,
    val createdOn: LocalDateTime,
    val value: BigDecimal,
    val description: String?,
    val fromWallet: TransferWalletView,
    val toWallet: TransferWalletView,
    val returnedTransfer: UUID?,
    val returned: Boolean,
    val returnOf: TransferReferenceView?,
    val returnedBy: TransferReferenceView?,
    val returnable: Boolean
)

data class TransferReferenceView(
    val id: UUID,
    val createdOn: LocalDateTime
)

data class TransferFilter(
    val wallet: UUID? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val from: LocalDate? = null,
    @param:DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    val to: LocalDate? = null,
    val filter: String? = null
)
