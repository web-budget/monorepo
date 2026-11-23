package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_CLOSED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_WITH_OPEN_INVOICES
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_WITH_OPEN_MOVEMENTS
import br.com.webbudget.server.domain.exceptions.ErrorCodes.ONLY_THE_LAST_CLOSED_PERIOD_CAN_BE_REOPENED
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCloseValidation
import br.com.webbudget.server.domain.validators.OnReopenValidation
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import br.com.webbudget.server.infrastructure.repository.registration.FinancialPeriodRepository
import org.springframework.stereotype.Component

interface FinancialPeriodClosingValidator : BusinessValidator<FinancialPeriodReference>

@Component
@OnCloseValidation
class FinancialPeriodOpenValidator : FinancialPeriodClosingValidator {

    override fun validate(value: FinancialPeriodReference) {
        if (!value.isOpen()) {
            throw DomainException("Only an open financial period can be closed", FINANCIAL_PERIOD_NOT_OPEN)
        }
    }
}

@Component
@OnCloseValidation
class FinancialPeriodOpenMovementsValidator(
    private val movementRepository: MovementRepository
) : FinancialPeriodClosingValidator {

    override fun validate(value: FinancialPeriodReference) {
        if (movementRepository.existsOpenInFinancialPeriod(value.id)) {
            throw DomainException(
                "The financial period still has open movements",
                FINANCIAL_PERIOD_WITH_OPEN_MOVEMENTS
            )
        }
    }
}

@Component
@OnCloseValidation
class FinancialPeriodOpenInvoicesValidator(
    private val invoiceRepository: InvoiceRepository
) : FinancialPeriodClosingValidator {

    override fun validate(value: FinancialPeriodReference) {
        if (invoiceRepository.existsOpenWithPurchases(value.id)) {
            throw DomainException(
                "The financial period still has open invoices with purchases",
                FINANCIAL_PERIOD_WITH_OPEN_INVOICES
            )
        }
    }
}

@Component
@OnReopenValidation
class FinancialPeriodClosedValidator : FinancialPeriodClosingValidator {

    override fun validate(value: FinancialPeriodReference) {
        if (value.isOpen()) {
            throw DomainException("Only a closed financial period can be reopened", FINANCIAL_PERIOD_NOT_CLOSED)
        }
    }
}

@Component
@OnReopenValidation
class FinancialPeriodLastClosedValidator(
    private val financialPeriodRepository: FinancialPeriodRepository
) : FinancialPeriodClosingValidator {

    override fun validate(value: FinancialPeriodReference) {
        if (financialPeriodRepository.existsClosedEndingAfter(value.endingAt)) {
            throw DomainException(
                "Only the last closed financial period can be reopened",
                ONLY_THE_LAST_CLOSED_PERIOD_CAN_BE_REOPENED
            )
        }
    }
}
