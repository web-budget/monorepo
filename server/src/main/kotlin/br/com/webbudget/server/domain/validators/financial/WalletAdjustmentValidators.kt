package br.com.webbudget.server.domain.validators.financial

import br.com.webbudget.server.domain.entities.financial.WalletAdjustment
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INACTIVE_WALLET
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_ADJUSTMENT_VALUE
import br.com.webbudget.server.domain.validators.BusinessValidator
import br.com.webbudget.server.domain.validators.OnCreateValidation
import org.springframework.stereotype.Component

interface WalletAdjustmentValidator : BusinessValidator<WalletAdjustment>

@Component
@OnCreateValidation
class WalletAdjustmentValueValidator : WalletAdjustmentValidator {

    override fun validate(value: WalletAdjustment) {
        if (value.value.signum() == 0) {
            throw DomainException("The adjustment value can not be zero", INVALID_ADJUSTMENT_VALUE)
        }
    }
}

@Component
@OnCreateValidation
class WalletAdjustmentWalletValidator : WalletAdjustmentValidator {

    override fun validate(value: WalletAdjustment) {
        if (!value.wallet.active) {
            throw DomainException("The wallet of the adjustment is not active", INACTIVE_WALLET)
        }
    }
}
