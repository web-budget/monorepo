package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.exceptions.InvalidUserStatusTransitionException
import br.com.webbudget.server.domain.exceptions.UnknownRolesException
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.administration.UserValidator
import br.com.webbudget.server.infrastructure.config.security.SelfActionGuard
import br.com.webbudget.server.infrastructure.repository.administration.AccountActivationAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.GrantRepository
import br.com.webbudget.server.infrastructure.repository.administration.PasswordRecoverAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.RoleRepository
import br.com.webbudget.server.infrastructure.repository.administration.TrustedDeviceRepository
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
    private val selfActionGuard: SelfActionGuard,
    private val accountMailNotifier: AccountMailNotifier,
    private val accountActivationService: AccountActivationService,
    private val passwordRecoverAttemptRepository: PasswordRecoverAttemptRepository,
    private val accountActivationAttemptRepository: AccountActivationAttemptRepository,
    private val trustedDeviceRepository: TrustedDeviceRepository,
    @OnCreateValidation
    private val creationValidators: List<UserValidator>,
    @OnUpdateValidation
    private val updateValidators: List<UserValidator>
) {

    @Transactional
    fun createAccount(user: User, roles: List<String>, notifyAccountCreated: Boolean = false): UUID {

        creationValidators.forEach { it.validate(user) }

        user.password = passwordEncoder.encode(requireNotNull(user.password) { "user.errors.null-password" })!!

        val saved = userRepository.insert(user)

        grantRoles(saved, roles)

        if (notifyAccountCreated) {
            accountActivationService.requestActivation(saved.email)
        }

        return saved.externalId!!
    }

    @Transactional
    fun createGoogleAccount(user: User): User {

        creationValidators.forEach { it.validate(user) }

        val saved = userRepository.insert(user)

        accountMailNotifier.notifyPendingApproval(saved)

        return saved
    }

    @Transactional
    fun updateAccount(user: User, roles: List<String>): User {

        selfActionGuard.assertRolesAndActivationUnchanged(user, roles)

        updateValidators.forEach { it.validate(user) }

        val saved = userRepository.update(user)

        grantRepository.deleteByUserId(saved.id!!)
        grantRoles(saved, roles)

        return saved.apply {
            this.grants = grantRepository.findByUserIds(listOf(saved.id!!))[saved.id].orEmpty().toMutableList()
        }
    }

    @Transactional
    fun updatePassword(user: User, password: String): User =
        userRepository.updatePassword(user, passwordEncoder.encode(password)!!)

    @Transactional
    fun resetPassword(user: User, password: String): User {

        selfActionGuard.assertNotSelf(user)

        return updatePassword(user, password)
    }

    @Transactional
    fun approve(user: User, roleNames: List<String>): User {

        selfActionGuard.assertNotSelf(user)

        requireStatus(user, UserStatus.PENDING)

        val roles = resolveRoles(roleNames)

        grantRepository.deleteByUserId(user.id!!)
        roles.forEach { role -> grantRepository.insert(user.id!!, role) }

        val approved = userRepository.updateStatus(user, UserStatus.PENDING, UserStatus.APPROVED)

        accountMailNotifier.notifyAccountApproved(approved, roles.map { it.name })

        return approved
    }

    @Transactional
    fun block(user: User): User {

        selfActionGuard.assertNotSelf(user)

        requireStatus(user, UserStatus.APPROVED)

        return userRepository.updateStatus(user, UserStatus.APPROVED, UserStatus.BLOCKED, revokeSessions = true)
    }

    @Transactional
    fun unblock(user: User): User {

        requireStatus(user, UserStatus.BLOCKED)

        return userRepository.updateStatus(user, UserStatus.BLOCKED, UserStatus.APPROVED)
    }

    @Transactional
    fun resetTotp(user: User) {

        selfActionGuard.assertNotSelf(user)

        val userId = requireNotNull(user.id) { "user.errors.null-id" }

        trustedDeviceRepository.deleteByUserId(userId)
        userRepository.resetTotp(userId)
    }

    @Transactional
    fun deleteAccount(user: User) {

        require(!user.isMainAdmin()) { "user.errors.cannot-delete-admin" }

        selfActionGuard.assertNotSelf(user)

        val userId = requireNotNull(user.id) { "user.errors.null-id" }

        grantRepository.deleteByUserId(userId)
        passwordRecoverAttemptRepository.deleteByUserId(userId)
        accountActivationAttemptRepository.deleteByUserId(userId)
        trustedDeviceRepository.deleteByUserId(userId)

        userRepository.delete(user)
    }

    private fun requireStatus(user: User, expected: UserStatus) {
        if (user.status != expected) {
            throw InvalidUserStatusTransitionException(user.status, expected)
        }
    }

    private fun resolveRoles(roleNames: List<String>): List<Role> {

        val found = roleNames.distinct().associateWith { roleRepository.findByName(it) }
        val unknown = found.filterValues { it == null }.keys

        if (unknown.isNotEmpty()) {
            throw UnknownRolesException(unknown)
        }

        return found.values.filterNotNull()
    }

    private fun grantRoles(user: User, roles: List<String>) {
        roles.forEach { roleName ->
            roleRepository.findByName(roleName)?.let { role -> grantRepository.insert(user.id!!, role) }
        }
    }
}
