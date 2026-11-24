package br.com.webbudget.server.domain.validators.registration

import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_WITH_PURCHASES
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.infrastructure.repository.financial.CardPurchaseRepository
import org.springframework.stereotype.Component

@Component
@OnDeleteValidation
class FinancialPeriodPurchasesValidator(
    private val cardPurchaseRepository: CardPurchaseRepository
) : FinancialPeriodValidator {

    override fun validate(value: FinancialPeriod) {
        if (cardPurchaseRepository.existsByFinancialPeriod(value.id!!)) {
            throw DomainException("A financial period with card purchases can not be deleted", FINANCIAL_PERIOD_WITH_PURCHASES)
        }
    }
}
