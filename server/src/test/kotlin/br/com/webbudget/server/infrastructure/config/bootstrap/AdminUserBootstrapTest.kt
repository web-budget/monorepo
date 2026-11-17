package br.com.webbudget.server.infrastructure.config.bootstrap

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.DefaultApplicationArguments
import org.springframework.data.domain.PageRequest

class AdminUserBootstrapTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var adminUserBootstrap: AdminUserBootstrap

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `should have created the admin with every role on startup`() {

        val admin = userRepository.findByEmail("admin@webbudget.com.br")

        assertThat(admin).isNotNull
        assertThat(admin!!.name).isEqualTo("Administrador")
        assertThat(admin.active).isTrue()
        assertThat(admin.password).isNotBlank()
        assertThat(admin.defaultLanguage).isEqualTo(Language.PT_BR)
        assertThat(admin.grants.map { it.role.name })
            .containsExactlyInAnyOrder("ADMINISTRATION", "REGISTRATION", "FINANCIAL", "DASHBOARDS")
    }

    @Test
    fun `should skip the creation when the admin already exists`() {

        adminUserBootstrap.run(DefaultApplicationArguments())

        val admins = userRepository.findAll("admin@webbudget.com.br", null, PageRequest.of(0, 10))

        assertThat(admins.content).hasSize(1)
    }
}
