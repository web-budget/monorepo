package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.payloads.financial.FinancialPeriodResultView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import br.com.webbudget.server.infrastructure.repository.financial.PeriodResultRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/financial-periods")
class FinancialPeriodResultController(
    private val movementRepository: MovementRepository,
    private val periodResultRepository: PeriodResultRepository,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    @GetMapping("/{id}/result")
    fun getResult(@PathVariable id: UUID): ResponseEntity<FinancialPeriodResultView> {

        val financialPeriod = movementReferenceRepository.findFinancialPeriod(id)
            ?: throw ResourceNotFoundException()

        val recorded = periodResultRepository.findByFinancialPeriod(financialPeriod.id)

        if (recorded != null) {
            return ResponseEntity.ok(FinancialPeriodResultView(recorded.revenues, recorded.expenses, recorded.result, true, BigDecimal.ZERO, 0, BigDecimal.ZERO))
        }

        val paid = movementRepository.sumPaidValueByType(financialPeriod.id)
        val revenues = paid[Movement.Type.INCOME] ?: BigDecimal.ZERO
        val expenses = paid[Movement.Type.EXPENSE] ?: BigDecimal.ZERO

        val open = movementRepository.sumOpenExpenses(financialPeriod.id, LocalDate.now())

        return ResponseEntity.ok(
            FinancialPeriodResultView(
                revenues = revenues,
                expenses = expenses,
                result = revenues.subtract(expenses),
                toPay = open.total,
                overdueExpenses = open.overdueCount,
                paidOnCard = movementRepository.sumPaidOnCard(financialPeriod.id),
                recorded = false
            )
        )
    }
}
