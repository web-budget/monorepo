package br.com.webbudget.server.domain.entities.registration

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

class Wallet(
    var name: String,
    var type: Type,
    var currentBalance: BigDecimal = BigDecimal.ZERO,
    var active: Boolean = true,
    var description: String? = null,
    var bank: String? = null,
    var agency: String? = null,
    var number: String? = null,
    var lastEntryOn: LocalDateTime? = null,
    var lastReconciliation: LastReconciliation? = null
) : PersistentEntity() {

    fun hasValidBankInformation(): Boolean = listOf(bank, agency, number).all { !it.isNullOrBlank() }

    enum class Type {
        BANK_ACCOUNT, PERSONAL, INVESTMENT
    }
}

class LastReconciliation(
    val externalId: UUID,
    val createdOn: LocalDateTime,
    val difference: BigDecimal
)
