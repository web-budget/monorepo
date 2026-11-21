package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.WalletEntryMapper
import br.com.webbudget.server.application.payloads.financial.AdjustmentForm
import br.com.webbudget.server.application.payloads.financial.StatementFilter
import br.com.webbudget.server.application.payloads.financial.WalletEntryView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.WalletAdjustmentService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.StatementCriteria
import br.com.webbudget.server.infrastructure.repository.financial.WalletEntryRepository
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
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/wallets")
class WalletEntryController(
    private val walletEntryMapper: WalletEntryMapper,
    private val walletEntryRepository: WalletEntryRepository,
    private val walletAdjustmentService: WalletAdjustmentService,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    @GetMapping("/{id}/statement")
    fun getStatement(
        @PathVariable id: UUID,
        filter: StatementFilter,
        pageable: Pageable
    ): ResponseEntity<PagedModel<WalletEntryView>> {

        val wallet = movementReferenceRepository.findWallet(id) ?: throw ResourceNotFoundException()

        val criteria = StatementCriteria(
            from = filter.from,
            to = filter.to,
            financialPeriod = filter.financialPeriod,
            origins = filter.origins,
            direction = filter.direction,
            text = filter.filter,
            minValue = filter.minValue,
            maxValue = filter.maxValue
        )

        return walletEntryRepository.findAll(wallet.id, criteria, pageable)
            .map { walletEntryMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @PostMapping("/{id}/adjustments")
    fun adjust(@PathVariable id: UUID, @RequestBody @Valid form: AdjustmentForm): ResponseEntity<WalletEntryView> {

        val wallet = movementReferenceRepository.findWallet(id) ?: throw ResourceNotFoundException()

        val entry = walletAdjustmentService.adjust(walletEntryMapper.mapToDomain(form, wallet))

        return ResponseEntity.ok(walletEntryMapper.mapToView(entry))
    }
}
