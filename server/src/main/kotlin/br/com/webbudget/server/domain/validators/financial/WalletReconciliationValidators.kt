package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.WalletReconciliation
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_WALLET
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_RECONCILIATION_REASON
import br.com.webbudget.server.domain.exceptions.ErrorCodes.RECONCILIATION_BALANCE_CHANGED
import br.com.webbudget.server.domain.exceptions.ErrorCodes.RECONCILIATION_WITHOUT_DIFFERENCE
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCreateValidation
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component

interface WalletReconciliationValidator : BusinessValidator<WalletReconciliation>

@Order(1)
@Component
@OnCreateValidation
class WalletReconciliationWalletValidator : WalletReconciliationValidator {

    override fun validate(value: WalletReconciliation) {
        if (!value.wallet.active) {
            throw DomainException("The wallet of the reconciliation is not active", INACTIVE_WALLET)
        }
    }
}

@Order(2)
@Component
@OnCreateValidation
class WalletReconciliationBalanceValidator : WalletReconciliationValidator {

    override fun validate(value: WalletReconciliation) {
        if (value.walletBalance.compareTo(value.shownBalance) != 0) {
            throw DomainException.conflict(
                parameters = mapOf(
                    "currentBalance" to value.walletBalance,
                    "difference" to value.difference,
                    "freeBalance" to value.balances.freeBalance,
                    "compartments" to value.balances.compartments
                ),
                message = "The balance of the wallet changed after it was shown",
                error = RECONCILIATION_BALANCE_CHANGED
            )
        }
    }
}

@Order(3)
@Component
@OnCreateValidation
class WalletReconciliationDifferenceValidator : WalletReconciliationValidator {

    override fun validate(value: WalletReconciliation) {
        if (value.difference.signum() == 0) {
            throw DomainException("The informed balance matches the balance of the wallet", RECONCILIATION_WITHOUT_DIFFERENCE)
        }
    }
}

@Order(4)
@Component
@OnCreateValidation
class WalletReconciliationReasonValidator : WalletReconciliationValidator {

    override fun validate(value: WalletReconciliation) {
        if (value.reason.isBlank() || value.reason.length > WalletReconciliation.MAX_REASON_LENGTH) {
            throw DomainException(
                "The reason must have from 1 to ${WalletReconciliation.MAX_REASON_LENGTH} characters",
                INVALID_RECONCILIATION_REASON
            )
        }
    }
}
