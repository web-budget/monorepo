package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.WalletEntryMapper
import br.com.webbudget.server.application.payloads.financial.TransferFilter
import br.com.webbudget.server.application.payloads.financial.TransferForm
import br.com.webbudget.server.application.payloads.financial.TransferView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.TransferService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.TransferCriteria
import br.com.webbudget.server.infrastructure.repository.financial.TransferRepository
import br.com.webbudget.server.infrastructure.repository.map
import jakarta.validation.Valid
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.support.ServletUriComponentsBuilder
import java.net.URI
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/transfers")
class TransferController(
    private val walletEntryMapper: WalletEntryMapper,
    private val transferService: TransferService,
    private val transferRepository: TransferRepository
) {

    @GetMapping
    fun getAll(filter: TransferFilter, pageable: Pageable): ResponseEntity<PagedModel<TransferView>> {

        val criteria = TransferCriteria(
            wallet = filter.wallet,
            from = filter.from,
            to = filter.to,
            text = filter.filter
        )

        return transferRepository.findAll(criteria, pageable)
            .map { walletEntryMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<TransferView> =
        ResponseEntity.ok(walletEntryMapper.mapToView(findTransfer(id)))

    @PostMapping
    fun create(@RequestBody @Valid form: TransferForm): ResponseEntity<Void> {

        val created = transferService.transfer(walletEntryMapper.mapToDomain(form))

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PostMapping("/{id}/return")
    fun returnTransfer(@PathVariable id: UUID): ResponseEntity<Void> {

        val created = transferService.returnTransfer(findTransfer(id))

        val location: URI = ServletUriComponentsBuilder.fromCurrentRequest()
            .replacePath("/private/v1/financial/transfers/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    private fun findTransfer(id: UUID) = transferRepository.findByExternalId(id)
        ?: throw ResourceNotFoundException()
}
