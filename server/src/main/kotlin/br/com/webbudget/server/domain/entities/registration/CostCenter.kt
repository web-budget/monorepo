package br.com.webbudget.server.domain.entities.registration

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal

class CostCenter(
    var name: String,
    var fullName: String,
    var active: Boolean = true,
    var description: String? = null,
    var expenseBudgetPercentage: BigDecimal? = null,
    var parent: CostCenter? = null
) : PersistentEntity() {

    fun updateFullName() {
        this.fullName = parent?.let { "${it.fullName} > $name" } ?: name
    }
}
