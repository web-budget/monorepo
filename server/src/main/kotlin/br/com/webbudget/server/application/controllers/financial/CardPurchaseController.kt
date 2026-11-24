package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.CardPurchaseMapper
import br.com.webbudget.server.application.payloads.financial.CardPurchaseCreateForm
import br.com.webbudget.server.application.payloads.financial.CardPurchaseFilter
import br.com.webbudget.server.application.payloads.financial.CardPurchaseListView
import br.com.webbudget.server.application.payloads.financial.CardPurchaseUpdateForm
import br.com.webbudget.server.application.payloads.financial.CardPurchaseView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.CardPurchaseService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.CardPurchaseCriteria
import br.com.webbudget.server.infrastructure.repository.financial.CardPurchaseRepository
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
@RequestMapping("/financial/card-purchases")
class CardPurchaseController(
    private val cardPurchaseMapper: CardPurchaseMapper,
    private val cardPurchaseService: CardPurchaseService,
    private val cardPurchaseRepository: CardPurchaseRepository
) {

    @GetMapping
    fun get(filter: CardPurchaseFilter, pageable: Pageable): ResponseEntity<PagedModel<CardPurchaseListView>> {

        val criteria = CardPurchaseCriteria(
            text = filter.filter,
            card = filter.card,
            invoice = filter.invoice,
            financialPeriod = filter.financialPeriod,
            costCenter = filter.costCenter,
            classification = filter.classification,
            from = filter.from,
            to = filter.to
        )

        return cardPurchaseRepository.findAll(criteria, pageable)
            .map { cardPurchaseMapper.mapToListView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<CardPurchaseView> =
        ResponseEntity.ok(cardPurchaseMapper.mapToView(findPurchase(id)))

    @PostMapping
    fun create(@RequestBody @Valid form: CardPurchaseCreateForm): ResponseEntity<Void> {

        val created = cardPurchaseService.create(cardPurchaseMapper.mapToDomain(form))

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @RequestBody @Valid form: CardPurchaseUpdateForm
    ): ResponseEntity<CardPurchaseView> {

        val purchase = cardPurchaseMapper.mapToDomain(form, findPurchase(id))

        return ResponseEntity.ok(cardPurchaseMapper.mapToView(cardPurchaseService.update(purchase)))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        cardPurchaseService.delete(findPurchase(id))

        return ResponseEntity.ok().build()
    }

    private fun findPurchase(id: UUID) = cardPurchaseRepository.findByExternalId(id)
        ?: throw ResourceNotFoundException()
}
