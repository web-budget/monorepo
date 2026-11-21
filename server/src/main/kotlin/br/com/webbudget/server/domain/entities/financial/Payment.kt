package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDate

class Payment(
    var wallet: WalletReference?,
    var paidOn: LocalDate,
    var discount: BigDecimal = BigDecimal.ZERO,
    var value: BigDecimal = BigDecimal.ZERO,
    var card: CardReference? = null
) : PersistentEntity() {

    val valuePaid: BigDecimal
        get() = value.subtract(discount)

    val method: Method
        get() = if (card != null) Method.CARD else Method.WALLET

    enum class Method { WALLET, CARD }
}
