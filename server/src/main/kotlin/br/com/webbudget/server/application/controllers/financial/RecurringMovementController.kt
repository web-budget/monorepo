package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.RecurringMovementMapper
import br.com.webbudget.server.application.payloads.financial.RecurringMovementCreateForm
import br.com.webbudget.server.application.payloads.financial.RecurringMovementFilter
import br.com.webbudget.server.application.payloads.financial.RecurringMovementListView
import br.com.webbudget.server.application.payloads.financial.RecurringMovementUpdateForm
import br.com.webbudget.server.application.payloads.financial.RecurringMovementView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.RecurringMovementService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import br.com.webbudget.server.infrastructure.repository.map
import jakarta.validation.Valid
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
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
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/recurring-movements")
class RecurringMovementController(
    private val recurringMovementMapper: RecurringMovementMapper,
    private val recurringMovementService: RecurringMovementService,
    private val recurringMovementRepository: RecurringMovementRepository
) {

    @GetMapping
    fun get(
        filter: RecurringMovementFilter,
        pageable: Pageable
    ): ResponseEntity<PagedModel<RecurringMovementListView>> =
        recurringMovementRepository.findAll(
            filter = filter.filter,
            states = filter.states,
            classification = filter.classification,
            costCenter = filter.costCenter,
            pageable = pageable
        )
            .map { recurringMovementMapper.mapToListView(it) }
            .let { ResponseEntity.ok(it) }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<RecurringMovementView> =
        recurringMovementRepository.findByExternalId(id)
            ?.let { recurringMovementMapper.mapToView(it) }
            ?.let { ResponseEntity.ok(it) }
            ?: throw ResourceNotFoundException()

    @PostMapping
    fun create(@RequestBody @Valid form: RecurringMovementCreateForm): ResponseEntity<Void> {

        val toCreate = recurringMovementMapper.mapToDomain(form)
        val created = recurringMovementService.create(toCreate)

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody @Valid form: RecurringMovementUpdateForm
    ): ResponseEntity<RecurringMovementListView> {

        val recurringMovement = recurringMovementRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        recurringMovementMapper.mapToDomain(form, recurringMovement)
        val updated = recurringMovementService.update(recurringMovement)

        return ResponseEntity.ok(recurringMovementMapper.mapToListView(updated))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        val recurringMovement = recurringMovementRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        recurringMovementService.delete(recurringMovement)

        return ResponseEntity.ok().build()
    }
}
