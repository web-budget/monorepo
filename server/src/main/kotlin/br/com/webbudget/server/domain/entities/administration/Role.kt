package br.com.webbudget.server.domain.entities.administration

import br.com.webbudget.server.domain.entities.PersistentEntity

class Role(val name: String) : PersistentEntity() {

    companion object {
        const val ADMINISTRATION = "ADMINISTRATION"
        const val DASHBOARDS = "DASHBOARDS"
        const val FINANCIAL = "FINANCIAL"
        const val REGISTRATION = "REGISTRATION"
    }
}
