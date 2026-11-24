package br.com.webbudget.server.domain.security

import br.com.webbudget.server.domain.entities.administration.AuthProvider
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import java.io.Serializable
import java.util.UUID

data class CurrentUser(
    val id: Long,
    val externalId: UUID,
    val name: String,
    val email: String,
    val status: UserStatus,
    val authProvider: AuthProvider,
    val credentialsVersion: Int,
    val hasPassword: Boolean,
    val googleLinked: Boolean,
    val totpEnabled: Boolean,
    val language: Language,
    val dueDateNotices: Boolean,
    val roles: Set<String>
) : Serializable {

    companion object {

        fun from(user: User): CurrentUser = CurrentUser(
            id = requireNotNull(user.id) { "Cannot build the current user of an unsaved user" },
            externalId = requireNotNull(user.externalId) { "Cannot build the current user of an unsaved user" },
            name = user.name,
            email = user.email,
            status = user.status,
            authProvider = user.authProvider,
            credentialsVersion = user.credentialsVersion,
            hasPassword = user.password != null,
            googleLinked = user.googleSub != null,
            totpEnabled = user.totpEnabled,
            language = user.defaultLanguage,
            dueDateNotices = user.dueDateNotices,
            roles = user.roleNames()
        )
    }
}
