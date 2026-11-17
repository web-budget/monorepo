package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.application.mappers.registration.WalletMapper
import br.com.webbudget.server.application.payloads.registration.WalletCreateForm
import br.com.webbudget.server.application.payloads.registration.WalletFilter
import br.com.webbudget.server.application.payloads.registration.WalletListView
import br.com.webbudget.server.application.payloads.registration.WalletUpdateForm
import br.com.webbudget.server.application.payloads.registration.WalletView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.registration.WalletService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.map
import br.com.webbudget.server.infrastructure.repository.registration.WalletRepository
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
@RequestMapping("/registration/wallets")
class WalletController(
    private val walletMapper: WalletMapper,
    private val walletService: WalletService,
    private val walletRepository: WalletRepository
) {

    @GetMapping
    fun get(filter: WalletFilter, pageable: Pageable): ResponseEntity<PagedModel<WalletListView>> =
        walletRepository.findAll(filter.filter, filter.status?.value, pageable)
            .map { walletMapper.mapToListView(it) }
            .let { ResponseEntity.ok(it) }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<WalletView> = walletRepository.findByExternalId(id)
        ?.let { walletMapper.mapToView(it) }
        ?.let { ResponseEntity.ok(it) }
        ?: throw ResourceNotFoundException()

    @PostMapping
    fun create(@RequestBody @Valid form: WalletCreateForm): ResponseEntity<Void> {

        val created = walletService.create(walletMapper.mapToDomain(form))

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.created(location).build()
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody @Valid form: WalletUpdateForm): ResponseEntity<WalletView> {

        val wallet = walletRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        walletMapper.mapToDomain(form, wallet)

        return ResponseEntity.ok(walletMapper.mapToView(walletService.update(wallet)))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {

        val wallet = walletRepository.findByExternalId(id)
            ?: throw ResourceNotFoundException()

        walletService.delete(wallet)

        return ResponseEntity.ok().build()
    }
}
