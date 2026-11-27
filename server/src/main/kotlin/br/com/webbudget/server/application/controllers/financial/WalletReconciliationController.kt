package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.WalletEntryMapper
import br.com.webbudget.server.application.payloads.financial.ReconciliationForm
import br.com.webbudget.server.application.payloads.financial.ReconciliationPositionView
import br.com.webbudget.server.application.payloads.financial.ReconciliationResultView
import br.com.webbudget.server.application.payloads.financial.ReconciliationView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.WalletReconciliationService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.WalletReconciliationRepository
import br.com.webbudget.server.infrastructure.repository.map
import jakarta.validation.Valid
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/wallets")
class WalletReconciliationController(
    private val walletEntryMapper: WalletEntryMapper,
    private val walletReconciliationService: WalletReconciliationService,
    private val movementReferenceRepository: MovementReferenceRepository,
    private val walletReconciliationRepository: WalletReconciliationRepository
) {

    @PostMapping("/{id}/reconciliations")
    fun reconcile(
        @PathVariable id: UUID,
        @RequestBody @Valid form: ReconciliationForm
    ): ResponseEntity<ReconciliationResultView> {

        val wallet = movementReferenceRepository.findWallet(id) ?: throw ResourceNotFoundException()

        val result = walletReconciliationService.reconcile(walletEntryMapper.mapToDomain(form, wallet))

        return ResponseEntity.status(HttpStatus.CREATED).body(walletEntryMapper.mapToView(result))
    }

    @GetMapping("/{id}/reconciliations")
    fun getAll(@PathVariable id: UUID, pageable: Pageable): ResponseEntity<PagedModel<ReconciliationView>> {

        val wallet = movementReferenceRepository.findWallet(id) ?: throw ResourceNotFoundException()

        return walletReconciliationRepository.findAll(wallet.id, pageable)
            .map { walletEntryMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @GetMapping("/{id}/reconciliations/{reconciliationId}/position")
    fun getPosition(
        @PathVariable id: UUID,
        @PathVariable reconciliationId: UUID
    ): ResponseEntity<ReconciliationPositionView> {

        val wallet = movementReferenceRepository.findWallet(id) ?: throw ResourceNotFoundException()

        val position = walletReconciliationRepository.findPosition(wallet.id, reconciliationId)
            ?: throw ResourceNotFoundException()

        return ResponseEntity.ok(ReconciliationPositionView(position))
    }
}
