package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.PeriodMovementMapper
import br.com.webbudget.server.application.payloads.financial.PeriodMovementCreateForm
import br.com.webbudget.server.application.payloads.financial.PeriodMovementFilter
import br.com.webbudget.server.application.payloads.financial.PeriodMovementListView
import br.com.webbudget.server.application.payloads.financial.PeriodMovementUpdateForm
import br.com.webbudget.server.application.payloads.financial.PeriodMovementView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.PeriodMovementService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.PeriodMovementRepository
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
@RequestMapping("/financial/period-movements")
class PeriodMovementController(
    private val periodMovementMapper: PeriodMovementMapper,
    private val periodMovementService: PeriodMovementService,
    private val periodMovementRepository: PeriodMovementRepository
) {

    @GetMapping
    fun get(filter: PeriodMovementFilter, pageable: Pageable): ResponseEntity<PagedModel<PeriodMovementListView>> =
        periodMovementRepository.findAll(
            filter = filter.filter,
            states = filter.states,
            classification = filter.classification,
            costCenter = filter.costCenter,
            financialPeriodIds = filter.financialPeriods,
            pageable = pageable
        )
            .map { periodMovementMapper.mapToListView(it) }
            .let { ResponseEntity.ok(it) }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<PeriodMovementView> =
        periodMovementRepository.findByExternalId(id)
            ?.let { periodMovementMapper.mapToView(it) }
            ?.let { ResponseEntity.ok(it) }
            ?: throw ResourceNotFoundException()

    @PostMapping
    fun create(@RequestBody @Valid form: PeriodMovementCreateForm): ResponseEntity<Void> {

        val toCreate = periodMovementMapper.mapToDomain(form)
        val created = periodMovementService.create(toCreate)

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody @Valid form: PeriodMovementUpdateForm
    ): ResponseEntity<PeriodMovementListView> {

        val periodMovement = periodMovementRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        periodMovementMapper.mapToDomain(form, periodMovement)
        val updated = periodMovementService.update(periodMovement)

        return ResponseEntity.ok(periodMovementMapper.mapToListView(updated))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        val periodMovement = periodMovementRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        periodMovementService.delete(periodMovement)

        return ResponseEntity.ok().build()
    }
}
