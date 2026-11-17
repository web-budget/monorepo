package br.com.webbudget.server.domain.validators.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.utilities.fixtures.createUser
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatNoException
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.test.context.jdbc.Sql

@Sql("/sql/administration/clear-tables.sql", "/sql/administration/create-user.sql")
class UserAccountEmailValidatorTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var userAccountEmailValidator: UserAccountEmailValidator

    @Test
    fun `should fail for a new account with a taken e-mail`() {

        val toValidate = createUser(email = "user@webbudget.com.br")

        assertThatThrownBy { userAccountEmailValidator.validate(toValidate) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.status).isEqualTo(HttpStatus.CONFLICT)
                assertThat(exception.parameters).containsEntry("user.email", "user@webbudget.com.br")
            }
    }

    @Test
    fun `should pass for a new account with a free e-mail`() {

        assertThatNoException()
            .isThrownBy { userAccountEmailValidator.validate(createUser(email = "free@webbudget.com.br")) }
    }

    @Test
    fun `should pass for a saved account keeping its own e-mail`() {

        val saved = userRepository.findByEmail("user@webbudget.com.br")!!

        assertThatNoException().isThrownBy { userAccountEmailValidator.validate(saved) }
    }

    @Test
    fun `should fail for a saved account taking the e-mail of another one`() {

        val saved = userRepository.findByEmail("user@webbudget.com.br")!!
        saved.email = "other-user@webbudget.com.br"

        assertThatThrownBy { userAccountEmailValidator.validate(saved) }
            .isInstanceOf(DomainException::class.java)
    }
}
