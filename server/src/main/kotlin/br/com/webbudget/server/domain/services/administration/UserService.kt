package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.administration.UserValidator
import br.com.webbudget.server.infrastructure.repository.administration.AccountActivationAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.GrantRepository
import br.com.webbudget.server.infrastructure.repository.administration.PasswordRecoverAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.RoleRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class UserService(
    private val userRepository: UserRepository,
    private val grantRepository: GrantRepository,
    private val passwordEncoder: PasswordEncoder,
    private val roleRepository: RoleRepository,
    private val accountActivationService: AccountActivationService,
    private val passwordRecoverAttemptRepository: PasswordRecoverAttemptRepository,
    private val accountActivationAttemptRepository: AccountActivationAttemptRepository,
    @OnCreateValidation
    private val creationValidators: List<UserValidator>,
    @OnUpdateValidation
    private val updateValidators: List<UserValidator>
) {

    @Transactional
    fun createAccount(user: User, roles: List<String>, notifyAccountCreated: Boolean = false): UUID {

        creationValidators.forEach { it.validate(user) }

        user.password = passwordEncoder.encode(user.password)!!

        val saved = userRepository.insert(user)

        grantRoles(saved, roles)

        if (notifyAccountCreated) {
            accountActivationService.requestActivation(saved.email)
        }

        return saved.externalId!!
    }

    @Transactional
    fun updateAccount(user: User, roles: List<String>): User {

        updateValidators.forEach { it.validate(user) }

        val saved = userRepository.update(user)

        grantRepository.deleteByUserId(saved.id!!)
        grantRoles(saved, roles)

        return saved.apply {
            this.grants = grantRepository.findByUserIds(listOf(saved.id!!))[saved.id].orEmpty().toMutableList()
        }
    }

    @Transactional
    fun updatePassword(user: User, password: String) {
        user.password = passwordEncoder.encode(password)!!
        userRepository.update(user)
    }

    @Transactional
    fun deleteAccount(user: User) {

        require(!user.isMainAdmin()) { "user.errors.cannot-delete-admin" }

        val userId = requireNotNull(user.id) { "user.errors.null-id" }

        grantRepository.deleteByUserId(userId)
        passwordRecoverAttemptRepository.deleteByUserId(userId)
        accountActivationAttemptRepository.deleteByUserId(userId)

        userRepository.delete(user)
    }

    private fun grantRoles(user: User, roles: List<String>) {
        roles.forEach { roleName ->
            roleRepository.findByName(roleName)?.let { role -> grantRepository.insert(user.id!!, role) }
        }
    }
}
