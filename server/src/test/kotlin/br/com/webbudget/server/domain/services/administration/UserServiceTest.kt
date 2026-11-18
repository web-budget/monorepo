package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.Language.EN_US
import br.com.webbudget.server.domain.entities.administration.Language.PT_BR
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.infrastructure.repository.administration.PasswordRecoverAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.utilities.fixtures.createUser
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.assertj.core.api.Assertions.fail
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.jdbc.Sql

@Sql("/sql/administration/clear-tables.sql", "/sql/administration/create-authorities.sql")
class UserServiceTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var userService: UserService

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var passwordRecoverAttemptRepository: PasswordRecoverAttemptRepository

    @Test
    fun `should save without sending the activation request`() {

        val externalId = userService.createAccount(createUser(), listOf("ANY_ROLE"))
        val created = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

        assertThat(created.id).isNotNull
        assertThat(created.version).isEqualTo(0.toShort())
        assertThat(created.createdOn).isNotNull
        assertThat(created.lastUpdate).isNull()
        assertThat(created.active).isFalse()
        assertThat(created.defaultLanguage).isEqualTo(PT_BR)
        assertThat(passwordEncoder.matches("s3cr3t", created.password)).isTrue()
        assertThat(created.grants.map { it.role.name }).containsExactly("ANY_ROLE")
        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should save and send the activation request`() {

        userService.createAccount(createUser(), listOf("ANY_ROLE"), true)

        assertThat(greenMail.receivedMessages).hasSize(1)
        assertThat(greenMail.receivedMessages.first().allRecipients.map { it.toString() })
            .containsExactly("user@test.com")
    }

    @Test
    fun `should grant every known role and ignore the unknown ones`() {

        val roles = listOf("SOME_ROLE", "ANY_ROLE", "ANY_OTHER_ROLE", "UNKNOWN_ROLE")

        val externalId = userService.createAccount(createUser(), roles)
        val saved = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

        assertThat(saved.grants.map { it.role.name })
            .containsExactlyInAnyOrder("SOME_ROLE", "ANY_ROLE", "ANY_OTHER_ROLE")
    }

    @Test
    fun `should not save when the e-mail is duplicated`() {

        userService.createAccount(createUser(), listOf("ANY_ROLE"))

        assertThatThrownBy { userService.createAccount(createUser(), listOf("ANY_ROLE")) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.status).isEqualTo(HttpStatus.CONFLICT)
            }
    }

    @Test
    fun `should update the account and replace the grants`() {

        val externalId = userService.createAccount(createUser(), listOf("ANY_ROLE"))
        val toUpdate = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

        toUpdate.apply {
            this.name = "Updated"
            this.active = true
            this.defaultLanguage = EN_US
        }

        val updated = userService.updateAccount(toUpdate, listOf("SOME_ROLE"))

        assertThat(updated.id).isEqualTo(toUpdate.id)
        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.lastUpdate).isNotNull
        assertThat(updated.grants.map { it.role.name }).containsExactly("SOME_ROLE")

        val reloaded = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

        assertThat(reloaded.name).isEqualTo("Updated")
        assertThat(reloaded.active).isTrue()
        assertThat(reloaded.defaultLanguage).isEqualTo(EN_US)
        assertThat(reloaded.password).isEqualTo(toUpdate.password)
    }

    @Test
    fun `should not update when the e-mail belongs to another account`() {

        userService.createAccount(createUser(), listOf("ANY_ROLE"))
        val externalId = userService.createAccount(createUser(email = "other@test.com"), listOf("ANY_ROLE"))

        val toUpdate = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)
        toUpdate.email = "user@test.com"

        assertThatThrownBy { userService.updateAccount(toUpdate, listOf("ANY_ROLE")) }
            .isInstanceOf(DomainException::class.java)
    }

    @Test
    fun `should refuse a stale version`() {

        val externalId = userService.createAccount(createUser(), listOf("ANY_ROLE"))

        val first = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)
        val second = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

        userService.updateAccount(first.apply { name = "First" }, listOf("ANY_ROLE"))

        assertThatThrownBy { userService.updateAccount(second.apply { name = "Second" }, listOf("ANY_ROLE")) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.status).isEqualTo(HttpStatus.CONFLICT)
                assertThat(exception.error).isEqualTo("concurrent-update")
            }

        assertThat(userRepository.findByExternalId(externalId)?.name).isEqualTo("First")
    }

    @Test
    fun `should update the password`() {

        val externalId = userService.createAccount(createUser(), listOf("ANY_ROLE"))
        val toUpdate = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

        userService.updatePassword(toUpdate, "new-secret")

        val updated = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

        assertThat(passwordEncoder.matches("new-secret", updated.password)).isTrue()
    }

    @Test
    fun `should delete the account with its grants and attempts`() {

        val externalId = userService.createAccount(createUser(), listOf("ANY_ROLE"), true)
        val toDelete = userRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

        userService.deleteAccount(toDelete)

        assertThat(userRepository.findByExternalId(externalId)).isNull()
        assertThat(passwordRecoverAttemptRepository.findByUserEmail("user@test.com")).isEmpty()
    }

    @Test
    fun `should not delete the main admin`() {

        val admin = userRepository.findByEmail(User.ADMIN_USERNAME) ?: fail(OBJECT_NOT_FOUND_ERROR)

        assertThatThrownBy { userService.deleteAccount(admin) }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `should not delete an account that was never saved`() {

        assertThatThrownBy { userService.deleteAccount(createUser()) }
            .isInstanceOf(IllegalArgumentException::class.java)
    }
}
