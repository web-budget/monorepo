package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.infrastructure.config.security.RegistrationAttemptLimiter
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

private val logger = KotlinLogging.logger {}

@Service
@Transactional(readOnly = true)
class AccountRegistrationService(
    private val userService: UserService,
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val registrationAttemptLimiter: RegistrationAttemptLimiter
) {

    @Transactional
    fun register(name: String, email: String, password: String, language: Language, clientIp: String) {

        registrationAttemptLimiter.checkAndRecord(clientIp)

        if (userRepository.existsByEmail(email)) {
            logger.info { "Registration attempted for an e-mail that is already registered, ignoring it" }
            passwordEncoder.encode(password)
            return
        }

        val user = User(
            active = false,
            name = name,
            email = email,
            password = password,
            defaultLanguage = language,
            status = UserStatus.PENDING
        )

        userService.createAccount(user, emptyList(), notifyAccountCreated = true)
    }
}
