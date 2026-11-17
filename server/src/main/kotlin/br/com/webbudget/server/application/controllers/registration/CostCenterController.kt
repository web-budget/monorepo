package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.application.mappers.registration.CostCenterMapper
import br.com.webbudget.server.application.payloads.registration.CostCenterCreateForm
import br.com.webbudget.server.application.payloads.registration.CostCenterFilter
import br.com.webbudget.server.application.payloads.registration.CostCenterListView
import br.com.webbudget.server.application.payloads.registration.CostCenterUpdateForm
import br.com.webbudget.server.application.payloads.registration.CostCenterView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.registration.CostCenterService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.map
import br.com.webbudget.server.infrastructure.repository.registration.CostCenterRepository
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
@RequiresRole(Role.REGISTRATION)
@RequestMapping("/registration/cost-centers")
class CostCenterController(
    private val costCenterMapper: CostCenterMapper,
    private val costCenterService: CostCenterService,
    private val costCenterRepository: CostCenterRepository
) {

    @GetMapping
    fun get(filter: CostCenterFilter, pageable: Pageable): ResponseEntity<PagedModel<CostCenterListView>> =
        costCenterRepository.findAll(filter.filter, filter.status?.value, pageable)
            .map { costCenterMapper.mapToListView(it) }
            .let { ResponseEntity.ok(it) }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<CostCenterView> = costCenterRepository.findByExternalId(id)
        ?.let { costCenterMapper.mapToView(it) }
        ?.let { ResponseEntity.ok(it) }
        ?: throw ResourceNotFoundException()

    @PostMapping
    fun create(@RequestBody @Valid form: CostCenterCreateForm): ResponseEntity<Void> {

        val created = costCenterService.create(costCenterMapper.mapToDomain(form))

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody @Valid form: CostCenterUpdateForm): ResponseEntity<CostCenterView> {

        val costCenter = costCenterRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        costCenterMapper.mapToDomain(form, costCenter)

        return ResponseEntity.ok(costCenterMapper.mapToView(costCenterService.update(costCenter)))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        val costCenter = costCenterRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        costCenterService.delete(costCenter)

        return ResponseEntity.ok().build()
    }
}
