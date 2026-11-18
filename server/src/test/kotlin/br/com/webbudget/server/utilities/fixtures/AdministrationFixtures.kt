package br.com.webbudget.server.utilities.fixtures

import br.com.webbudget.server.domain.entities.administration.Grant
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.Language.PT_BR
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.administration.User

fun createUser(
    active: Boolean = false,
    name: String = "User",
    email: String = "user@test.com",
    password: String? = "s3cr3t",
    language: Language = PT_BR,
    vararg roles: String
) = User(
    active = active,
    name = name,
    email = email,
    password = password,
    defaultLanguage = language,
    grants = roles.map { role -> Grant(Role(role)) }.toMutableList()
)
