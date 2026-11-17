package br.com.webbudget.server.infrastructure.config.bootstrap

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.services.administration.UserService
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.jooq.administration.tables.references.GRANTS
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.DefaultApplicationArguments
import org.springframework.data.domain.PageRequest
import org.springframework.security.crypto.password.PasswordEncoder

class AdminUserBootstrapTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var adminUserBootstrap: AdminUserBootstrap

    @Autowired
    private lateinit var userService: UserService

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should have created the admin with every role on startup`() {

        val admin = userRepository.findByEmail("admin@webbudget.com.br")

        assertThat(admin).isNotNull
        assertThat(admin!!.name).isEqualTo("Administrador")
        assertThat(admin.active).isTrue()
        assertThat(admin.status.name).isEqualTo("APPROVED")
        assertThat(admin.authProvider.name).isEqualTo("LOCAL")
        assertThat(admin.credentialsVersion).isZero()
        assertThat(admin.password).isNotBlank()
        assertThat(admin.defaultLanguage).isEqualTo(Language.PT_BR)
        assertThat(admin.grants.map { it.role.name })
            .containsExactlyInAnyOrder("ADMINISTRATION", "REGISTRATION", "FINANCIAL", "DASHBOARDS")
    }

    @Test
    fun `should have seeded the admin with the configured default password`() {

        val admin = userRepository.findByEmail("admin@webbudget.com.br")!!

        assertThat(passwordEncoder.matches(ADMIN_PASSWORD, admin.password)).isTrue()
    }

    @Test
    fun `should skip the creation when the admin already exists`() {

        adminUserBootstrap.run(DefaultApplicationArguments())

        val admins = userRepository.findAll("admin@webbudget.com.br", null, PageRequest.of(0, 10))

        assertThat(admins.content).hasSize(1)
    }

    @Test
    fun `should generate a random password when none is configured`() {

        deleteAdmin()

        try {
            AdminUserBootstrap("", userService, userRepository).run(DefaultApplicationArguments())

            val admin = userRepository.findByEmail("admin@webbudget.com.br")!!

            assertThat(passwordEncoder.matches(ADMIN_PASSWORD, admin.password)).isFalse()
            assertThat(admin.grants).hasSize(4)
        } finally {
            deleteAdmin()
            adminUserBootstrap.run(DefaultApplicationArguments())
        }
    }

    private fun deleteAdmin() {
        dsl.deleteFrom(GRANTS)
            .where(GRANTS.ID_USER.`in`(dsl.select(USERS.ID).from(USERS).where(USERS.EMAIL.eq("admin@webbudget.com.br"))))
            .execute()
        dsl.deleteFrom(USERS).where(USERS.EMAIL.eq("admin@webbudget.com.br")).execute()
    }
}
