package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.MovementMapper
import br.com.webbudget.server.application.payloads.financial.MovementCreateForm
import br.com.webbudget.server.application.payloads.financial.MovementFilter
import br.com.webbudget.server.application.payloads.financial.MovementListView
import br.com.webbudget.server.application.payloads.financial.MovementUpdateForm
import br.com.webbudget.server.application.payloads.financial.MovementView
import br.com.webbudget.server.application.payloads.financial.PaymentForm
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.MovementService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.MovementCriteria
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import br.com.webbudget.server.infrastructure.repository.map
import jakarta.validation.Valid
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.support.ServletUriComponentsBuilder
import java.time.LocalDate
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/movements")
class MovementController(
    private val movementMapper: MovementMapper,
    private val movementService: MovementService,
    private val movementRepository: MovementRepository
) {

    @GetMapping
    fun get(filter: MovementFilter, pageable: Pageable): ResponseEntity<PagedModel<MovementListView>> {

        val criteria = MovementCriteria(
            text = filter.filter,
            type = filter.type,
            statuses = filter.statuses,
            overdue = filter.overdue,
            classification = filter.classification,
            costCenter = filter.costCenter,
            financialPeriods = filter.financialPeriods,
            dueFrom = filter.dueFrom,
            dueTo = filter.dueTo,
            invoicePayments = filter.invoicePayments
        )

        return movementRepository.findAll(criteria, LocalDate.now(), pageable)
            .map { movementMapper.mapToListView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<MovementView> =
        ResponseEntity.ok(movementMapper.mapToView(findMovement(id)))

    @PostMapping
    fun create(@RequestBody @Valid form: MovementCreateForm): ResponseEntity<Void> {

        val created = movementService.create(
            movementMapper.mapToDomain(form),
            form.payment?.let { movementMapper.mapToDomain(it) }
        )

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody @Valid form: MovementUpdateForm
    ): ResponseEntity<MovementView> {

        val movement = movementMapper.mapToDomain(form, findMovement(id))

        return ResponseEntity.ok(movementMapper.mapToView(movementService.update(movement)))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        movementService.delete(findMovement(id))

        return ResponseEntity.ok().build()
    }

    @PatchMapping("/{id}/pay")
    fun pay(@PathVariable id: UUID, @RequestBody @Valid form: PaymentForm): ResponseEntity<MovementView> {

        val paid = movementService.pay(findMovement(id), movementMapper.mapToDomain(form))

        return ResponseEntity.ok(movementMapper.mapToView(paid))
    }

    @PatchMapping("/{id}/undo-payment")
    fun undoPayment(@PathVariable id: UUID): ResponseEntity<MovementView> {

        val reopened = movementService.undoPayment(findMovement(id))

        return ResponseEntity.ok(movementMapper.mapToView(reopened))
    }

    private fun findMovement(id: UUID) = movementRepository.findByExternalId(id)
        ?: throw ResourceNotFoundException()
}
