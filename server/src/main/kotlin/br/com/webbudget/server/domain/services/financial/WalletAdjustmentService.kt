package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.WalletAdjustment
import br.com.webbudget.server.domain.entities.financial.WalletEntry
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Direction
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Origin
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.financial.WalletAdjustmentValidator
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class WalletAdjustmentService(
    private val walletLedger: WalletLedger,
    @OnCreateValidation
    private val creationValidators: List<WalletAdjustmentValidator>
) {

    @Transactional
    fun adjust(adjustment: WalletAdjustment): WalletEntry {

        creationValidators.forEach { it.validate(adjustment) }

        return walletLedger.post(
            walletId = adjustment.wallet.id,
            direction = if (adjustment.value.signum() > 0) Direction.CREDIT else Direction.DEBIT,
            origin = Origin.ADJUSTMENT,
            value = adjustment.value.abs(),
            name = adjustment.name ?: DEFAULT_NAME
        )
    }

    companion object {

        private const val DEFAULT_NAME = "Ajuste de saldo"
    }
}
