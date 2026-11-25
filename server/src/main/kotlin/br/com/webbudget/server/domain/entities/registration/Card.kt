package br.com.webbudget.server.domain.entities.registration

import br.com.webbudget.server.domain.entities.PersistentEntity

class Card(
    var name: String,
    var lastFourDigits: String,
    var invoicePaymentDay: Int,
    var active: Boolean = true,
    var flag: String? = null,
    var wallet: Wallet? = null
) : PersistentEntity()
