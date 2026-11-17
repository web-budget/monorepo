package br.com.webbudget.server.domain.entities.registration

import br.com.webbudget.server.domain.entities.PersistentEntity

class Card(
    var name: String,
    var lastFourDigits: String,
    var type: Type,
    var active: Boolean = true,
    var invoicePaymentDay: Int? = null,
    var flag: String? = null,
    var wallet: Wallet? = null
) : PersistentEntity() {

    enum class Type {
        CREDIT, DEBIT
    }
}
