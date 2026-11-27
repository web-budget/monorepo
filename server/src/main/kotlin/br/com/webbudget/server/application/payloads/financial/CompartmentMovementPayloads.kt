package br.com.webbudget.server.application.payloads.financial

import br.com.webbudget.server.application.payloads.ErrorCodes.IS_NULL
import br.com.webbudget.server.application.payloads.ErrorCodes.MAX_CHARS
import br.com.webbudget.server.domain.entities.financial.CompartmentMovement.Direction
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

data class CompartmentMovementForm(
    @field:NotNull(message = IS_NULL)
    val direction: Direction?,
    @field:NotNull(message = IS_NULL)
    val value: BigDecimal?,
    @field:Size(message = MAX_CHARS, max = 150)
    val note: String? = null
)

data class CompartmentMovementView(
    val id: UUID,
    val createdOn: LocalDateTime,
    val direction: Direction,
    val value: BigDecimal,
    val previousBalance: BigDecimal,
    val resultingBalance: BigDecimal,
    val note: String? = null,
    val entryId: UUID? = null,
    val importId: UUID? = null
)

data class CompartmentMovementCreatedView(
    val movement: CompartmentMovementView,
    val walletBalance: BigDecimal,
    val compartmentBalance: BigDecimal,
    val entry: WalletEntryView
)

data class CompartmentMovementPositionView(
    val position: Long
)

data class CompartmentReserveView(
    val balance: BigDecimal
)
