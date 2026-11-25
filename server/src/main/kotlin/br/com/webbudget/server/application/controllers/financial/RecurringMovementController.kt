package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.RecurringMovementMapper
import br.com.webbudget.server.application.payloads.financial.RecurringExtraLaunchForm
import br.com.webbudget.server.application.payloads.financial.RecurringLaunchEntryView
import br.com.webbudget.server.application.payloads.financial.RecurringLaunchForm
import br.com.webbudget.server.application.payloads.financial.RecurringLaunchView
import br.com.webbudget.server.application.payloads.financial.RecurringMovementCreateForm
import br.com.webbudget.server.application.payloads.financial.RecurringMovementFilter
import br.com.webbudget.server.application.payloads.financial.RecurringMovementUpdateForm
import br.com.webbudget.server.application.payloads.financial.RecurringMovementView
import br.com.webbudget.server.application.payloads.financial.RecurringValueForm
import br.com.webbudget.server.application.payloads.financial.RecurringValueView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.RecurringLaunchService
import br.com.webbudget.server.domain.services.financial.RecurringMovementService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementCriteria
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
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
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/recurring-movements")
class RecurringMovementController(
    private val recurringMovementMapper: RecurringMovementMapper,
    private val recurringMovementService: RecurringMovementService,
    private val recurringLaunchService: RecurringLaunchService,
    private val recurringMovementRepository: RecurringMovementRepository,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    @GetMapping
    fun get(filter: RecurringMovementFilter, pageable: Pageable): ResponseEntity<PagedModel<RecurringMovementView>> {

        val criteria = RecurringMovementCriteria(
            text = filter.filter,
            type = filter.type,
            valueKinds = filter.valueKinds,
            active = filter.active,
            finished = filter.finished,
            ended = filter.ended,
            cards = filter.cards,
            financialPeriod = filter.financialPeriod
        )

        return recurringMovementRepository.findAll(criteria, pageable)
            .map { recurringMovementMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<RecurringMovementView> =
        ResponseEntity.ok(recurringMovementMapper.mapToView(findRecurringMovement(id)))

    @GetMapping("/{id}/values")
    fun getValues(@PathVariable id: UUID, pageable: Pageable): ResponseEntity<PagedModel<RecurringValueView>> =
        recurringMovementRepository.findValues(findRecurringMovement(id).id!!, pageable)
            .map { recurringMovementMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }

    @GetMapping("/{id}/launches")
    fun getLaunches(@PathVariable id: UUID, pageable: Pageable): ResponseEntity<PagedModel<RecurringLaunchEntryView>> =
        recurringMovementRepository.findLaunches(findRecurringMovement(id).id!!, pageable)
            .map { recurringMovementMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }

    @PostMapping
    fun create(@RequestBody @Valid form: RecurringMovementCreateForm): ResponseEntity<Void> {

        val created = recurringMovementService.create(recurringMovementMapper.mapToDomain(form))

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
    ): ResponseEntity<RecurringMovementView> {

        val recurringMovement = recurringMovementMapper.mapToDomain(form, findRecurringMovement(id))

        return ResponseEntity.ok(recurringMovementMapper.mapToView(recurringMovementService.update(recurringMovement)))
    }

    @PatchMapping("/{id}/value")
    fun changeValue(
        @PathVariable id: UUID,
        @RequestBody @Valid form: RecurringValueForm
    ): ResponseEntity<RecurringMovementView> {

        val changed = recurringMovementService.changeValue(findRecurringMovement(id), form.value!!, form.reason)

        return ResponseEntity.ok(recurringMovementMapper.mapToView(changed))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        recurringMovementService.delete(findRecurringMovement(id))

        return ResponseEntity.ok().build()
    }

    @PostMapping("/launch")
    fun launch(@RequestBody @Valid form: RecurringLaunchForm): ResponseEntity<RecurringLaunchView> {

        val financialPeriod = movementReferenceRepository.findFinancialPeriod(form.financialPeriod!!)
            ?: throw ResourceNotFoundException()

        val report = recurringLaunchService.launch(financialPeriod, recurringMovementMapper.mapToDomain(form))

        return ResponseEntity.ok(recurringMovementMapper.mapToView(report))
    }

    @PostMapping("/{id}/launch-extra")
    fun launchExtra(
        @PathVariable id: UUID,
        @RequestBody @Valid form: RecurringExtraLaunchForm
    ): ResponseEntity<RecurringLaunchView> {

        val recurringMovement = findRecurringMovement(id)

        val financialPeriod = movementReferenceRepository.findFinancialPeriod(form.financialPeriod!!)
            ?: throw ResourceNotFoundException()

        val report = recurringLaunchService.launchExtra(recurringMovement, financialPeriod, form.quantity!!, form.value)

        return ResponseEntity.ok(recurringMovementMapper.mapToView(report))
    }

    private fun findRecurringMovement(id: UUID) = recurringMovementRepository.findByExternalId(id)
        ?: throw ResourceNotFoundException()
}
