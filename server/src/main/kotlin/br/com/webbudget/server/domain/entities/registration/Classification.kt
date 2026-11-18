package br.com.webbudget.server.domain.entities.registration

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal

class Classification(
    var name: String,
    var type: Type,
    var active: Boolean = true,
    var budget: BigDecimal? = null,
    var description: String? = null
) : PersistentEntity() {

    enum class Type {
        INCOME, EXPENSE
    }
}
