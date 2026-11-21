package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.CardPurchaseMapper
import br.com.webbudget.server.application.payloads.financial.InvoiceFilter
import br.com.webbudget.server.application.payloads.financial.InvoiceView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceCriteria
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.map
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/invoices")
class InvoiceController(
    private val cardPurchaseMapper: CardPurchaseMapper,
    private val invoiceRepository: InvoiceRepository
) {

    @GetMapping
    fun get(filter: InvoiceFilter, pageable: Pageable): ResponseEntity<PagedModel<InvoiceView>> {

        val criteria = InvoiceCriteria(filter.card, filter.financialPeriod, filter.statuses)

        return invoiceRepository.findAll(criteria, pageable)
            .map { cardPurchaseMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<InvoiceView> =
        invoiceRepository.findByExternalId(id)
            ?.let { cardPurchaseMapper.mapToView(it) }
            ?.let { ResponseEntity.ok(it) }
            ?: throw ResourceNotFoundException()
}
