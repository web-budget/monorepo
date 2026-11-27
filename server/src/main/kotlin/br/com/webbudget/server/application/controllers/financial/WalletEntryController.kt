package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.WalletEntryMapper
import br.com.webbudget.server.application.payloads.financial.StatementFilter
import br.com.webbudget.server.application.payloads.financial.StatementSummaryView
import br.com.webbudget.server.application.payloads.financial.WalletEntryView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.StatementCriteria
import br.com.webbudget.server.infrastructure.repository.financial.WalletEntryRepository
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
@RequestMapping("/financial/wallets")
class WalletEntryController(
    private val walletEntryMapper: WalletEntryMapper,
    private val walletEntryRepository: WalletEntryRepository,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    @GetMapping("/{id}/statement")
    fun getStatement(
        @PathVariable id: UUID,
        filter: StatementFilter,
        pageable: Pageable
    ): ResponseEntity<PagedModel<WalletEntryView>> {

        val wallet = movementReferenceRepository.findWallet(id) ?: throw ResourceNotFoundException()

        return walletEntryRepository.findAll(wallet.id, filter.toCriteria(), pageable)
            .map { walletEntryMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @GetMapping("/{id}/statement/summary")
    fun getStatementSummary(@PathVariable id: UUID, filter: StatementFilter): ResponseEntity<StatementSummaryView> {

        val wallet = movementReferenceRepository.findWallet(id) ?: throw ResourceNotFoundException()

        return ResponseEntity.ok(walletEntryMapper.mapToView(walletEntryRepository.summarize(wallet.id, filter.toCriteria())))
    }

    @GetMapping("/{id}/statement/{entryId}")
    fun getStatementEntry(@PathVariable id: UUID, @PathVariable entryId: UUID): ResponseEntity<WalletEntryView> {

        val wallet = movementReferenceRepository.findWallet(id) ?: throw ResourceNotFoundException()

        val line = walletEntryRepository.findByExternalId(wallet.id, entryId) ?: throw ResourceNotFoundException()

        return ResponseEntity.ok(walletEntryMapper.mapToDetailView(line, wallet))
    }

    private fun StatementFilter.toCriteria() = StatementCriteria(
        from = from,
        to = to,
        financialPeriod = financialPeriod,
        origins = origins,
        direction = direction,
        text = filter,
        minValue = minValue,
        maxValue = maxValue
    )
}
