package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.CLASSIFICATION_TYPE_MISMATCH
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.IMPORT_ACTION_NOT_ALLOWED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.IMPORT_DRAFT_ALREADY_EXISTS
import br.com.webbudget.server.domain.exceptions.ErrorCodes.IMPORT_NOT_EDITABLE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.IMPORT_TARGET_REQUIRED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_CARD
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_CLASSIFICATION
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_COST_CENTER
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_WALLET
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_INSTALLMENTS
import br.com.webbudget.server.domain.exceptions.ErrorCodes.NO_OPEN_INVOICE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.TRANSFER_BETWEEN_SAME_WALLET
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.financial.ImportRepository
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import org.springframework.stereotype.Component

interface ImportValidator : BusinessValidator<Import>

interface ImportLineValidator : BusinessValidator<ImportLine>

@Component
@OnCreateValidation
class ImportTargetValidator : ImportValidator {

    override fun validate(value: Import) {
        if ((value.card == null) == (value.wallet == null)) {
            throw DomainException("An import needs exactly one of card and wallet", IMPORT_TARGET_REQUIRED)
        }
    }
}

@Component
@OnCreateValidation
class ImportFinancialPeriodValidator : ImportValidator {

    override fun validate(value: Import) {
        if (!value.financialPeriod.isOpen()) {
            throw DomainException("The financial period is not open", FINANCIAL_PERIOD_NOT_OPEN)
        }
    }
}

@Component
@OnCreateValidation
class ImportActiveTargetValidator : ImportValidator {

    override fun validate(value: Import) {

        if (value.card?.active == false) {
            throw DomainException("The card is inactive", INACTIVE_CARD)
        }

        if (value.wallet?.active == false) {
            throw DomainException("The wallet is inactive", INACTIVE_WALLET)
        }
    }
}

@Component
@OnCreateValidation
class ImportOpenInvoiceValidator(
    private val invoiceRepository: InvoiceRepository
) : ImportValidator {

    override fun validate(value: Import) {

        val card = value.card ?: return

        if (invoiceRepository.findByCardAndFinancialPeriod(card.id, value.financialPeriod.id)?.isOpen() != true) {
            throw DomainException("The card has no open invoice in the financial period", NO_OPEN_INVOICE)
        }
    }
}

@Component
@OnCreateValidation
class ImportSingleDraftValidator(
    private val importRepository: ImportRepository
) : ImportValidator {

    override fun validate(value: Import) {
        if (importRepository.existsDraft(value.card?.id, value.wallet?.id, value.financialPeriod.id)) {
            throw DomainException.conflict(
                message = "There is already a draft for the destination and the period",
                error = IMPORT_DRAFT_ALREADY_EXISTS
            )
        }
    }
}

@Component
@OnUpdateValidation
class ImportLineEditableValidator : ImportLineValidator {

    override fun validate(value: ImportLine) {
        if (value.import.status != Import.Status.READY) {
            throw DomainException.conflict(message = "The import is not a draft to edit", error = IMPORT_NOT_EDITABLE)
        }
    }
}

@Component
@OnUpdateValidation
class ImportLineActionValidator : ImportLineValidator {

    override fun validate(value: ImportLine) {
        if (value.action !in value.allowedActions()) {
            throw DomainException("The action is not allowed for this destination and line", IMPORT_ACTION_NOT_ALLOWED)
        }
    }
}

@Component
@OnUpdateValidation
class ImportLineClassificationValidator : ImportLineValidator {

    override fun validate(value: ImportLine) {

        val expectedType = if (value.isCredit) Movement.Type.INCOME.name else Movement.Type.EXPENSE.name

        value.classification?.let { classification ->

            if (classification.type != expectedType) {
                throw DomainException("The classification type does not match the line", CLASSIFICATION_TYPE_MISMATCH)
            }

            if (!classification.active) {
                throw DomainException("The classification is inactive", INACTIVE_CLASSIFICATION)
            }
        }

        if (value.costCenter?.active == false) {
            throw DomainException("The cost center is inactive", INACTIVE_COST_CENTER)
        }
    }
}

@Component
@OnUpdateValidation
class ImportLineInstallmentsValidator : ImportLineValidator {

    override fun validate(value: ImportLine) {

        val installment = value.installment
        val installments = value.installments

        val consistent = if (installment == null || installments == null) {
            installment == null && installments == null
        } else {
            installment in 1..installments
        }

        if (!consistent) {
            throw DomainException("The installments of the line are invalid", INVALID_INSTALLMENTS)
        }
    }
}

@Component
@OnUpdateValidation
class ImportLineTransferWalletValidator : ImportLineValidator {

    override fun validate(value: ImportLine) {

        val wallet = value.targetWallet ?: return

        if (value.action != ImportAction.TRANSFER) {
            throw DomainException("Only a transfer takes a destination wallet", IMPORT_ACTION_NOT_ALLOWED)
        }

        if (wallet.id == value.import.wallet?.id) {
            throw DomainException("The transfer wallets must differ", TRANSFER_BETWEEN_SAME_WALLET)
        }

        if (!wallet.active) {
            throw DomainException("The wallet is inactive", INACTIVE_WALLET)
        }
    }
}
