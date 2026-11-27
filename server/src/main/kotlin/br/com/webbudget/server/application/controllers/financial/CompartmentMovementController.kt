package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.CompartmentMovementMapper
import br.com.webbudget.server.application.payloads.financial.CompartmentMovementCreatedView
import br.com.webbudget.server.application.payloads.financial.CompartmentMovementForm
import br.com.webbudget.server.application.payloads.financial.CompartmentMovementPositionView
import br.com.webbudget.server.application.payloads.financial.CompartmentMovementView
import br.com.webbudget.server.application.payloads.financial.CompartmentReserveView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.financial.CompartmentReference
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.CompartmentMovementService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.CompartmentMovementRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.map
import br.com.webbudget.server.infrastructure.repository.registration.CompartmentRepository
import jakarta.validation.Valid
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.support.ServletUriComponentsBuilder
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial")
class CompartmentMovementController(
    private val compartmentMovementMapper: CompartmentMovementMapper,
    private val compartmentMovementService: CompartmentMovementService,
    private val compartmentMovementRepository: CompartmentMovementRepository,
    private val movementReferenceRepository: MovementReferenceRepository,
    private val compartmentRepository: CompartmentRepository
) {

    @GetMapping("/wallets/{id}/compartments/{compartmentId}/movements")
    fun getHistory(
        @PathVariable id: UUID,
        @PathVariable compartmentId: UUID,
        pageable: Pageable
    ): ResponseEntity<PagedModel<CompartmentMovementView>> =
        compartmentMovementRepository.findAll(findCompartment(id, compartmentId).id, pageable)
            .map { compartmentMovementMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }

    @GetMapping("/wallets/{id}/compartments/{compartmentId}/movements/{movementId}/position")
    fun getPosition(
        @PathVariable id: UUID,
        @PathVariable compartmentId: UUID,
        @PathVariable movementId: UUID,
        pageable: Pageable
    ): ResponseEntity<CompartmentMovementPositionView> {

        val position = compartmentMovementRepository.findPosition(findCompartment(id, compartmentId).id, movementId, pageable)
            ?: throw ResourceNotFoundException()

        return ResponseEntity.ok(CompartmentMovementPositionView(position))
    }

    @PostMapping("/wallets/{id}/compartments/{compartmentId}/movements")
    fun move(
        @PathVariable id: UUID,
        @PathVariable compartmentId: UUID,
        @RequestBody @Valid form: CompartmentMovementForm
    ): ResponseEntity<CompartmentMovementCreatedView> {

        val compartment = findCompartment(id, compartmentId)

        val result = compartmentMovementService.move(compartmentMovementMapper.mapToDomain(form, compartment))

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{movementId}")
            .buildAndExpand(result.movement.externalId)
            .toUri()

        return ResponseEntity.status(HttpStatus.CREATED)
            .location(location)
            .body(compartmentMovementMapper.mapToCreatedView(result))
    }

    @GetMapping("/compartments/reserve")
    fun getReserve(): ResponseEntity<CompartmentReserveView> =
        ResponseEntity.ok(CompartmentReserveView(compartmentRepository.sumReserveBalance()))

    private fun findCompartment(id: UUID, compartmentId: UUID): CompartmentReference =
        movementReferenceRepository.findCompartment(id, compartmentId) ?: throw ResourceNotFoundException()
}
