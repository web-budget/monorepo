package br.com.webbudget.server.application.mappers.administration

import br.com.webbudget.server.application.payloads.administration.UserCreateForm
import br.com.webbudget.server.application.payloads.administration.UserUpdateForm
import br.com.webbudget.server.application.payloads.administration.UserView
import br.com.webbudget.server.domain.entities.administration.User
import org.springframework.stereotype.Component

@Component
class UserMapper {

    fun mapToView(user: User) = UserView(
        id = user.externalId!!,
        active = user.active,
        name = user.name,
        email = user.email,
        defaultLanguage = user.defaultLanguage,
        authorities = user.grants.map { it.role.name }
    )

    fun mapToDomain(form: UserCreateForm): User = User(
        name = form.name!!,
        email = form.email!!,
        password = form.password!!,
        defaultLanguage = form.defaultLanguage!!
    )

    fun mapToDomain(form: UserUpdateForm, user: User): User = user.apply {
        this.active = form.active
        this.name = form.name!!
        this.defaultLanguage = form.defaultLanguage!!
    }
}
