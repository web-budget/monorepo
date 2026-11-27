package br.com.webbudget.server.domain.entities.registration

import br.com.webbudget.server.domain.entities.PersistentEntity

class Classification(
    var name: String,
    var type: Type,
    var active: Boolean = true,
    var description: String? = null,
    var generic: Boolean = false
) : PersistentEntity() {

    enum class Type {
        INCOME, EXPENSE
    }
}
