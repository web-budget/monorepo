package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDate

class Payment(
    var wallet: WalletReference,
    var paidOn: LocalDate,
    var discount: BigDecimal = BigDecimal.ZERO,
    var value: BigDecimal = BigDecimal.ZERO,
    var method: Method = Method.WALLET
) : PersistentEntity() {

    val valuePaid: BigDecimal
        get() = value.subtract(discount)

    enum class Method { WALLET }
}
