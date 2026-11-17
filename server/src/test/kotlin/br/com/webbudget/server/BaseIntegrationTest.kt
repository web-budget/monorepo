package br.com.webbudget.server

import com.icegreen.greenmail.util.GreenMail
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.test.context.TestSecurityContextHolder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.client.RestTestClient

@AutoConfigureMockMvc
@ActiveProfiles("test")
@AutoConfigureRestTestClient
@SpringBootTest
@Import(TestcontainersConfiguration::class, MailTestConfiguration::class)
abstract class BaseIntegrationTest {

    @Autowired
    protected lateinit var restTestClient: RestTestClient

    @Autowired
    protected lateinit var greenMail: GreenMail

    @BeforeEach
    fun authenticateAsEveryRole() {
        authenticateWithRoles(*ALL_ROLES)
        greenMail.purgeEmailFromAllMailboxes()
    }

    @AfterEach
    fun clearAuthentication() {
        TestSecurityContextHolder.clearContext()
    }

    protected fun authenticateWithRoles(vararg roles: String) {
        val authorities = roles.map { SimpleGrantedAuthority("ROLE_$it") }
        TestSecurityContextHolder.setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated("test-user", "n/a", authorities)
        )
    }

    protected fun authenticateAnonymously() {
        TestSecurityContextHolder.clearContext()
    }

    companion object {
        const val OBJECT_NOT_FOUND_ERROR = "Invalid state, object not found"

        private val ALL_ROLES = arrayOf("ADMINISTRATION", "REGISTRATION", "FINANCIAL", "DASHBOARDS")
    }
}
