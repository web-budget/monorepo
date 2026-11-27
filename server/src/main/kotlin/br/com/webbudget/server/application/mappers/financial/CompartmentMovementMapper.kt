package br.com.webbudget.server.application.mappers.financial

import br.com.webbudget.server.application.payloads.financial.CompartmentMovementCreatedView
import br.com.webbudget.server.application.payloads.financial.CompartmentMovementForm
import br.com.webbudget.server.application.payloads.financial.CompartmentMovementView
import br.com.webbudget.server.application.payloads.financial.StatementEntryReferenceView
import br.com.webbudget.server.domain.entities.financial.CompartmentMovement
import br.com.webbudget.server.domain.entities.financial.CompartmentMovementLine
import br.com.webbudget.server.domain.entities.financial.CompartmentMovementResult
import br.com.webbudget.server.domain.entities.financial.CompartmentReference
import org.springframework.stereotype.Component

@Component
class CompartmentMovementMapper(
    private val walletEntryMapper: WalletEntryMapper
) {

    fun mapToDomain(form: CompartmentMovementForm, compartment: CompartmentReference): CompartmentMovement =
        CompartmentMovement(
            compartment = compartment,
            direction = form.direction!!,
            value = form.value!!,
            note = form.note
        )

    fun mapToView(line: CompartmentMovementLine): CompartmentMovementView = CompartmentMovementView(
        id = line.externalId,
        createdOn = line.createdOn,
        direction = line.direction,
        value = line.value,
        previousBalance = line.previousBalance,
        resultingBalance = line.resultingBalance,
        note = line.note,
        entryId = line.walletEntryExternalId,
        importId = line.importExternalId
    )

    fun mapToCreatedView(result: CompartmentMovementResult): CompartmentMovementCreatedView {

        val movement = result.movement

        return CompartmentMovementCreatedView(
            movement = CompartmentMovementView(
                id = movement.externalId!!,
                createdOn = movement.createdOn!!,
                direction = movement.direction,
                value = movement.value,
                previousBalance = movement.previousBalance,
                resultingBalance = movement.resultingBalance,
                note = movement.note,
                entryId = result.entry.externalId
            ),
            walletBalance = result.entry.resultingBalance,
            compartmentBalance = movement.resultingBalance,
            entry = walletEntryMapper.mapToView(result.entry).copy(
                reference = StatementEntryReferenceView(
                    type = "COMPARTMENT",
                    id = movement.compartment.externalId,
                    movementId = movement.externalId
                )
            )
        )
    }
}
