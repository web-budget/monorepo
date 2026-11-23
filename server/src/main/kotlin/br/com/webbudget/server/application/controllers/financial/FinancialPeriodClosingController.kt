package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.MovementMapper
import br.com.webbudget.server.application.payloads.financial.ClosingSummaryView
import br.com.webbudget.server.application.payloads.financial.FinancialPeriodResultView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.ClosingSummaryService
import br.com.webbudget.server.domain.services.financial.FinancialPeriodClosingService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/financial-periods")
class FinancialPeriodClosingController(
    private val movementMapper: MovementMapper,
    private val closingSummaryService: ClosingSummaryService,
    private val financialPeriodClosingService: FinancialPeriodClosingService,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    @GetMapping("/{id}/closing")
    fun getClosingSummary(@PathVariable id: UUID): ResponseEntity<ClosingSummaryView> {

        val summary = closingSummaryService.summarize(findFinancialPeriod(id))

        return ResponseEntity.ok(movementMapper.mapToView(summary))
    }

    @PatchMapping("/{id}/close")
    fun close(@PathVariable id: UUID): ResponseEntity<FinancialPeriodResultView> {

        val periodResult = financialPeriodClosingService.close(findFinancialPeriod(id))

        return ResponseEntity.ok(
            FinancialPeriodResultView(periodResult.revenues, periodResult.expenses, periodResult.result, true)
        )
    }

    @PatchMapping("/{id}/reopen")
    fun reopen(@PathVariable id: UUID): ResponseEntity<Void> {

        financialPeriodClosingService.reopen(findFinancialPeriod(id))

        return ResponseEntity.ok().build()
    }

    private fun findFinancialPeriod(id: UUID): FinancialPeriodReference =
        movementReferenceRepository.findFinancialPeriod(id) ?: throw ResourceNotFoundException()
}
