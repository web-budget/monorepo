package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.application.mappers.registration.CompartmentMapper
import br.com.webbudget.server.application.payloads.registration.CompartmentCreateForm
import br.com.webbudget.server.application.payloads.registration.CompartmentUpdateForm
import br.com.webbudget.server.application.payloads.registration.CompartmentView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.registration.Compartment
import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.registration.CompartmentService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.registration.CompartmentRepository
import br.com.webbudget.server.infrastructure.repository.registration.WalletRepository
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.support.ServletUriComponentsBuilder
import java.util.UUID

@RestController
@RequiresRole(Role.REGISTRATION)
@RequestMapping("/registration/wallets/{id}/compartments")
class CompartmentController(
    private val compartmentMapper: CompartmentMapper,
    private val compartmentService: CompartmentService,
    private val walletRepository: WalletRepository,
    private val compartmentRepository: CompartmentRepository
) {

    @GetMapping
    fun get(@PathVariable id: UUID): ResponseEntity<List<CompartmentView>> =
        compartmentRepository.findAllByWallet(findWallet(id))
            .map { compartmentMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }

    @GetMapping("/{compartmentId}")
    fun getById(@PathVariable id: UUID, @PathVariable compartmentId: UUID): ResponseEntity<CompartmentView> =
        ResponseEntity.ok(compartmentMapper.mapToView(findCompartment(id, compartmentId)))

    @PostMapping
    fun create(@PathVariable id: UUID, @RequestBody @Valid form: CompartmentCreateForm): ResponseEntity<Void> {

        val created = compartmentService.create(compartmentMapper.mapToDomain(form, findWallet(id)))

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{compartmentId}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PutMapping("/{compartmentId}")
    fun update(
        @PathVariable id: UUID,
        @PathVariable compartmentId: UUID,
        @RequestBody @Valid form: CompartmentUpdateForm
    ): ResponseEntity<CompartmentView> {

        val compartment = compartmentMapper.mapToDomain(form, findCompartment(id, compartmentId))

        return ResponseEntity.ok(compartmentMapper.mapToView(compartmentService.update(compartment)))
    }

    @DeleteMapping("/{compartmentId}")
    fun delete(@PathVariable id: UUID, @PathVariable compartmentId: UUID): ResponseEntity<Void> {

        compartmentService.delete(findCompartment(id, compartmentId))

        return ResponseEntity.ok().build()
    }

    private fun findWallet(id: UUID): Wallet = walletRepository.findByExternalId(id)
        ?: throw ResourceNotFoundException()

    private fun findCompartment(id: UUID, compartmentId: UUID): Compartment =
        compartmentRepository.findByExternalId(findWallet(id), compartmentId)
            ?: throw ResourceNotFoundException()
}
