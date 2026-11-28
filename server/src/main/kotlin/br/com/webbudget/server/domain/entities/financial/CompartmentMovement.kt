package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

class CompartmentMovement(
    val compartment: CompartmentReference,
    val direction: Direction,
    val value: BigDecimal,
    val note: String? = null,
    var previousBalance: BigDecimal = BigDecimal.ZERO,
    var resultingBalance: BigDecimal = BigDecimal.ZERO
) : PersistentEntity() {

    enum class Direction { DEPOSIT, WITHDRAWAL }
}

class CompartmentMovementLine(
    val externalId: UUID,
    val createdOn: LocalDateTime,
    val direction: CompartmentMovement.Direction,
    val value: BigDecimal,
    val note: String?,
    val previousBalance: BigDecimal,
    val resultingBalance: BigDecimal,
    val walletEntryExternalId: UUID?,
    val importExternalId: UUID? = null
)

class CompartmentMovementResult(
    val movement: CompartmentMovement,
    val entry: WalletEntry
)
