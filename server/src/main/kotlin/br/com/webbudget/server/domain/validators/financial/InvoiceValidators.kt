package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVOICE_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVOICE_WITHOUT_PURCHASES
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCloseValidation
import org.springframework.stereotype.Component

interface InvoiceValidator : BusinessValidator<Invoice>

@Component
@OnCloseValidation
class InvoiceOpenValidator : InvoiceValidator {

    override fun validate(value: Invoice) {
        if (!value.isOpen()) {
            throw DomainException("Only an open invoice can be closed", INVOICE_NOT_OPEN)
        }
    }
}

@Component
@OnCloseValidation
class InvoiceFinancialPeriodValidator : InvoiceValidator {

    override fun validate(value: Invoice) {
        if (!value.financialPeriod.isOpen()) {
            throw DomainException("The financial period of the invoice is not open", FINANCIAL_PERIOD_NOT_OPEN)
        }
    }
}

@Component
@OnCloseValidation
class InvoicePurchasesValidator : InvoiceValidator {

    override fun validate(value: Invoice) {
        if (value.value.signum() <= 0) {
            throw DomainException("An invoice without purchases can not be closed", INVOICE_WITHOUT_PURCHASES)
        }
    }
}
