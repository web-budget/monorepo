package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.WalletEntry
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Direction
import br.com.webbudget.server.domain.entities.financial.WalletEntry.Origin
import br.com.webbudget.server.infrastructure.repository.financial.WalletEntryRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
@Transactional(readOnly = true)
class WalletLedger(
    private val walletEntryRepository: WalletEntryRepository
) {

    @Transactional
    fun post(
        walletId: Long,
        direction: Direction,
        origin: Origin,
        value: BigDecimal,
        name: String,
        movementId: Long? = null,
        financialPeriodId: Long? = null,
        transferId: Long? = null
    ): WalletEntry {

        val delta = if (direction == Direction.CREDIT) value else value.negate()
        val resultingBalance = walletEntryRepository.applyBalanceDelta(walletId, delta)

        val entry = WalletEntry(
            name = name,
            direction = direction,
            origin = origin,
            value = value,
            previousBalance = resultingBalance.subtract(delta),
            resultingBalance = resultingBalance,
            walletId = walletId,
            movementId = movementId,
            financialPeriodId = financialPeriodId,
            transferId = transferId
        )

        return walletEntryRepository.insert(entry)
    }
}
