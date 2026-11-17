package br.com.webbudget.server.domain.validators.administration

import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import org.springframework.stereotype.Component

@Component
@OnUpdateValidation
@OnCreateValidation
class UserAccountEmailValidator(
    private val userRepository: UserRepository
) : UserValidator {

    override fun validate(value: User) {
        val conflicting = if (value.isSaved()) {
            userRepository.existsByEmailAndExternalIdNot(value.email, value.externalId!!)
        } else {
            userRepository.existsByEmail(value.email)
        }

        if (conflicting) {
            throw DomainException.conflict(parameters = mapOf("user.email" to value.email))
        }
    }
}
