package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.RecurringMovementMapper
import br.com.webbudget.server.application.mappers.registration.FinancialPeriodMapper
import br.com.webbudget.server.application.payloads.registration.FinancialPeriodCreateForm
import br.com.webbudget.server.application.payloads.registration.FinancialPeriodCreatedView
import br.com.webbudget.server.application.payloads.registration.FinancialPeriodFilter
import br.com.webbudget.server.application.payloads.registration.FinancialPeriodListView
import br.com.webbudget.server.application.payloads.registration.FinancialPeriodStatusFilter
import br.com.webbudget.server.application.payloads.registration.FinancialPeriodUpdateForm
import br.com.webbudget.server.application.payloads.registration.FinancialPeriodView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.registration.FinancialPeriodService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.map
import br.com.webbudget.server.infrastructure.repository.registration.FinancialPeriodRepository
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
@RequestMapping("/financial/financial-periods")
class FinancialPeriodController(
    private val financialPeriodMapper: FinancialPeriodMapper,
    private val recurringMovementMapper: RecurringMovementMapper,
    private val financialPeriodService: FinancialPeriodService,
    private val financialPeriodRepository: FinancialPeriodRepository
) {

    @GetMapping
    fun get(filter: FinancialPeriodFilter, pageable: Pageable): ResponseEntity<PagedModel<FinancialPeriodListView>> {

        val statuses = (filter.status ?: FinancialPeriodStatusFilter.CLOSED).statuses

        return financialPeriodRepository.findAll(filter.filter, statuses, pageable)
            .map { financialPeriodMapper.mapToListView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<FinancialPeriodView> =
        financialPeriodRepository.findByExternalId(id)
            ?.let { financialPeriodMapper.mapToView(it) }
            ?.let { ResponseEntity.ok(it) }
            ?: throw ResourceNotFoundException()

    @GetMapping("/active")
    fun getActive(pageable: Pageable): ResponseEntity<PagedModel<FinancialPeriodView>> =
        financialPeriodRepository.findByStatus(FinancialPeriod.Status.OPEN, pageable)
            .map { financialPeriodMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }

    @PostMapping
    fun create(@RequestBody @Valid form: FinancialPeriodCreateForm): ResponseEntity<FinancialPeriodCreatedView> {

        val created = financialPeriodService.create(financialPeriodMapper.mapToDomain(form))

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.externalId)
            .toUri()

        val view = FinancialPeriodCreatedView(recurringMovementMapper.mapToView(created.recurringLaunch!!))

        return ResponseEntity.created(location).body(view)
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody @Valid form: FinancialPeriodUpdateForm
    ): ResponseEntity<FinancialPeriodView> {

        val financialPeriod = financialPeriodRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        financialPeriodMapper.mapToDomain(form, financialPeriod)

        return ResponseEntity.ok(financialPeriodMapper.mapToView(financialPeriodService.update(financialPeriod)))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        val financialPeriod = financialPeriodRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        financialPeriodService.delete(financialPeriod)

        return ResponseEntity.ok().build()
    }
}
