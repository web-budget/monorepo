package br.com.webbudget.server.domain.entities.administration

import br.com.webbudget.server.domain.entities.PersistentEntity

class User(
    var active: Boolean = false,
    var name: String,
    var email: String,
    var password: String,
    var defaultLanguage: Language,
    var grants: MutableList<Grant> = mutableListOf()
) : PersistentEntity() {

    fun isMainAdmin(): Boolean = this.email == ADMIN_USERNAME

    companion object {
        const val ADMIN_USERNAME = "admin@webbudget.com.br"
    }
}
