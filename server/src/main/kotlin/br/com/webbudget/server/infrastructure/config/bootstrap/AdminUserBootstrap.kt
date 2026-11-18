package br.com.webbudget.server.infrastructure.config.bootstrap

import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.services.administration.UserService
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import java.security.SecureRandom
import java.util.Base64

private val logger = KotlinLogging.logger {}

@Component
class AdminUserBootstrap(
    @param:Value($$"${web-budget.security.admin-default-password:}")
    private val adminDefaultPassword: String,
    private val userService: UserService,
    private val userRepository: UserRepository
) : ApplicationRunner {

    override fun run(args: ApplicationArguments) {

        if (userRepository.existsByEmail(User.ADMIN_USERNAME)) {
            logger.debug { "Admin user already exists, skipping bootstrap" }
            return
        }

        logger.warn { "No admin user found, creating default admin account" }

        val initialPassword = adminDefaultPassword.ifBlank { generateInitialPassword() }

        val admin = User(
            active = true,
            name = "Administrador",
            email = User.ADMIN_USERNAME,
            password = initialPassword,
            defaultLanguage = Language.PT_BR
        )

        userService.createAccount(admin, ALL_ROLES)

        logger.info { "Admin account created successfully" }

        if (adminDefaultPassword.isBlank()) {
            logger.warn { "Initial password is $initialPassword change it as soon as possible" }
        } else {
            logger.warn { "Initial password was taken from the configured default, change it as soon as possible" }
        }
    }

    private fun generateInitialPassword(): String = ByteArray(PASSWORD_BYTES)
        .also { bytes -> SecureRandom().nextBytes(bytes) }
        .let { bytes -> Base64.getUrlEncoder().withoutPadding().encodeToString(bytes) }

    companion object {
        private const val PASSWORD_BYTES = 18

        private val ALL_ROLES = listOf(Role.ADMINISTRATION, Role.REGISTRATION, Role.FINANCIAL, Role.DASHBOARDS)
    }
}
