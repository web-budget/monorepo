package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.RecurringMovementMapper
import br.com.webbudget.server.application.payloads.financial.FinancialPeriodCreationPreviewView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.services.financial.FinancialPeriodPreviewService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/financial-periods")
class FinancialPeriodPreviewController(
    private val recurringMovementMapper: RecurringMovementMapper,
    private val financialPeriodPreviewService: FinancialPeriodPreviewService
) {

    @GetMapping("/creation-preview")
    fun getCreationPreview(): ResponseEntity<FinancialPeriodCreationPreviewView> =
        ResponseEntity.ok(recurringMovementMapper.mapToView(financialPeriodPreviewService.creationPreview()))
}
