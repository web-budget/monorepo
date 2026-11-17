package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.application.mappers.registration.ClassificationMapper
import br.com.webbudget.server.application.payloads.registration.ClassificationCreateForm
import br.com.webbudget.server.application.payloads.registration.ClassificationFilter
import br.com.webbudget.server.application.payloads.registration.ClassificationListView
import br.com.webbudget.server.application.payloads.registration.ClassificationUpdateForm
import br.com.webbudget.server.application.payloads.registration.ClassificationView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.registration.ClassificationService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.map
import br.com.webbudget.server.infrastructure.repository.registration.ClassificationRepository
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
@RequestMapping("/registration/classifications")
class ClassificationController(
    private val classificationMapper: ClassificationMapper,
    private val classificationService: ClassificationService,
    private val classificationRepository: ClassificationRepository
) {

    @GetMapping
    fun get(filter: ClassificationFilter, pageable: Pageable): ResponseEntity<PagedModel<ClassificationListView>> =
        classificationRepository.findAll(filter.filter, filter.status?.value, pageable)
            .map { classificationMapper.mapToListView(it) }
            .let { ResponseEntity.ok(it) }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<ClassificationView> =
        classificationRepository.findByExternalId(id)
            ?.let { classificationMapper.mapToView(it) }
            ?.let { ResponseEntity.ok(it) }
            ?: throw ResourceNotFoundException()

    @PostMapping
    fun create(@RequestBody @Valid form: ClassificationCreateForm): ResponseEntity<Void> {

        val created = classificationService.create(classificationMapper.mapToDomain(form))

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody @Valid form: ClassificationUpdateForm
    ): ResponseEntity<ClassificationView> {

        val classification = classificationRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        classificationMapper.mapToDomain(form, classification)

        return ResponseEntity.ok(classificationMapper.mapToView(classificationService.update(classification)))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        val classification = classificationRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        classificationService.delete(classification)

        return ResponseEntity.ok().build()
    }
}
