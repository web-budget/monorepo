package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.CardPurchase
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.CLASSIFICATION_TYPE_MISMATCH
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_CLASSIFICATION
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_COST_CENTER
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVOICE_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.NO_OPEN_INVOICE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.PURCHASE_BOUND_TO_MOVEMENT
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnDeleteValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import org.springframework.stereotype.Component

interface CardPurchaseValidator : BusinessValidator<CardPurchase>

@Component
@OnCreateValidation
class CardPurchaseOpenInvoiceValidator : CardPurchaseValidator {

    override fun validate(value: CardPurchase) {
        if (value.invoice?.isOpen() != true) {
            throw DomainException("The card has no open invoice in the financial period", NO_OPEN_INVOICE)
        }
    }
}

@Component
@OnUpdateValidation
@OnDeleteValidation
class CardPurchaseInvoiceStatusValidator : CardPurchaseValidator {

    override fun validate(value: CardPurchase) {
        if (!value.invoice!!.isOpen()) {
            throw DomainException("The invoice of the purchase is not open", INVOICE_NOT_OPEN)
        }
    }
}

@Component
@OnCreateValidation
@OnUpdateValidation
@OnDeleteValidation
class CardPurchaseFinancialPeriodValidator : CardPurchaseValidator {

    override fun validate(value: CardPurchase) {
        if (!value.financialPeriod.isOpen()) {
            throw DomainException("The financial period of the purchase is not open", FINANCIAL_PERIOD_NOT_OPEN)
        }
    }
}

@Component
@OnCreateValidation
@OnUpdateValidation
class CardPurchaseClassificationValidator : CardPurchaseValidator {

    override fun validate(value: CardPurchase) {

        if (value.classification.type != Movement.Type.EXPENSE.name) {
            throw DomainException("A card purchase needs an expense classification", CLASSIFICATION_TYPE_MISMATCH)
        }

        if (value.movementId != null) {
            return
        }

        if (!value.classification.active) {
            throw DomainException("The classification of the purchase is not active", INACTIVE_CLASSIFICATION)
        }

        if (!value.costCenter.active) {
            throw DomainException("The cost center of the purchase is not active", INACTIVE_COST_CENTER)
        }
    }
}

@Component
@OnUpdateValidation
@OnDeleteValidation
class CardPurchaseMovementValidator : CardPurchaseValidator {

    override fun validate(value: CardPurchase) {
        if (value.movementId != null) {
            throw DomainException(
                "A purchase that came from a movement changes only by undoing the payment of the movement",
                PURCHASE_BOUND_TO_MOVEMENT
            )
        }
    }
}
