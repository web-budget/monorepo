package br.com.webbudget.server.domain.entities.administration

import br.com.webbudget.server.domain.entities.PersistentEntity

class User(
    var active: Boolean = false,
    var name: String,
    var email: String,
    var password: String?,
    var defaultLanguage: Language,
    var grants: MutableList<Grant> = mutableListOf(),
    var status: UserStatus = UserStatus.APPROVED,
    var authProvider: AuthProvider = AuthProvider.LOCAL,
    var credentialsVersion: Int = 0,
    var totpEnabled: Boolean = false,
    var googleSub: String? = null
) : PersistentEntity() {

    fun isMainAdmin(): Boolean = this.email == ADMIN_USERNAME

    fun roleNames(): Set<String> = grants.map { it.role.name }.toSet()

    companion object {
        const val ADMIN_USERNAME = "admin@webbudget.com.br"
    }
}
