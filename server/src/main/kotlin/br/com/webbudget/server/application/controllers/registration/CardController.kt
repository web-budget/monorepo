package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.application.mappers.registration.CardMapper
import br.com.webbudget.server.application.payloads.registration.CardCreateForm
import br.com.webbudget.server.application.payloads.registration.CardFilter
import br.com.webbudget.server.application.payloads.registration.CardListView
import br.com.webbudget.server.application.payloads.registration.CardUpdateForm
import br.com.webbudget.server.application.payloads.registration.CardView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.registration.CardService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.map
import br.com.webbudget.server.infrastructure.repository.registration.CardRepository
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
@RequestMapping("/registration/cards")
class CardController(
    private val cardMapper: CardMapper,
    private val cardService: CardService,
    private val cardRepository: CardRepository
) {

    @GetMapping
    fun get(filter: CardFilter, pageable: Pageable): ResponseEntity<PagedModel<CardListView>> =
        cardRepository.findAll(filter.filter, filter.status?.value, pageable)
            .map { cardMapper.mapToListView(it) }
            .let { ResponseEntity.ok(it) }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<CardView> = cardRepository.findByExternalId(id)
        ?.let { cardMapper.mapToView(it) }
        ?.let { ResponseEntity.ok(it) }
        ?: throw ResourceNotFoundException()

    @PostMapping
    fun create(@RequestBody @Valid form: CardCreateForm): ResponseEntity<Void> {

        val created = cardService.create(cardMapper.mapToDomain(form))

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody @Valid form: CardUpdateForm): ResponseEntity<CardView> {

        val card = cardRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        cardMapper.mapToDomain(form, card)

        return ResponseEntity.ok(cardMapper.mapToView(cardService.update(card)))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        val card = cardRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        cardService.delete(card)

        return ResponseEntity.ok().build()
    }
}
