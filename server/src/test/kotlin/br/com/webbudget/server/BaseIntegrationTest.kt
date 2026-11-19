package br.com.webbudget.server

import br.com.webbudget.server.RestClientTestConfiguration.Companion.CSRF_COOKIE
import br.com.webbudget.server.RestClientTestConfiguration.Companion.CSRF_HEADER
import br.com.webbudget.server.RestClientTestConfiguration.Companion.SESSION_COOKIE
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.services.administration.UserService
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import com.icegreen.greenmail.util.GreenMail
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT
import org.springframework.context.annotation.Import
import org.springframework.core.env.Environment
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.client.RestTestClient
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

@AutoConfigureRestTestClient
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Import(TestcontainersConfiguration::class, MailTestConfiguration::class, RestClientTestConfiguration::class)
abstract class BaseIntegrationTest {

    @Autowired
    protected lateinit var restTestClient: RestTestClient

    @Autowired
    protected lateinit var greenMail: GreenMail

    @Autowired
    protected lateinit var sessionCookies: TestSessionCookies

    @Autowired
    private lateinit var accountService: UserService

    @Autowired
    private lateinit var accountRepository: UserRepository

    @Autowired
    private lateinit var environment: Environment

    private val createdUserEmails = mutableListOf<String>()

    @BeforeEach
    fun setUpAuthentication() {
        loginBeforeEach()
        greenMail.purgeEmailFromAllMailboxes()
    }

    protected open fun loginBeforeEach() {
        authenticateAs(User.ADMIN_USERNAME, ADMIN_PASSWORD)
    }

    @AfterEach
    fun clearAuthentication() {
        sessionCookies.header = null
        createdUserEmails.mapNotNull { accountRepository.findByEmail(it) }.forEach { accountService.deleteAccount(it) }
        createdUserEmails.clear()
    }

    protected fun authenticateAs(email: String, password: String) {
        sessionCookies.header = login(email, password)
    }

    protected fun authenticateWithRoles(vararg roles: String) {

        if (roles.toSet() == ALL_ROLES) {
            authenticateAs(User.ADMIN_USERNAME, ADMIN_PASSWORD)
            return
        }

        val email = "test-${roles.joinToString("-").lowercase()}@webbudget.com.br"

        createLoginUser(email, TEST_PASSWORD, *roles)
        authenticateAs(email, TEST_PASSWORD)
    }

    protected fun authenticateAnonymously() {
        sessionCookies.header = "$CSRF_COOKIE=${fetchCsrfToken()}"
    }

    protected fun createLoginUser(
        email: String,
        password: String = TEST_PASSWORD,
        vararg roles: String,
        active: Boolean = true
    ): User {

        val user = User(
            active = active,
            name = "Test user",
            email = email,
            password = password,
            defaultLanguage = Language.PT_BR
        )

        accountService.createAccount(user, roles.toList())
        createdUserEmails.add(email)

        return accountRepository.findByEmail(email)!!
    }

    protected fun login(email: String, password: String, totpCode: String? = null): String {

        val csrfToken = fetchCsrfToken()

        val response = HTTP_CLIENT.send(
            HttpRequest.newBuilder(uri("/private/v1/auth/login"))
                .header("Content-Type", "application/json")
                .header("Cookie", "$CSRF_COOKIE=$csrfToken")
                .header(CSRF_HEADER, csrfToken)
                .POST(HttpRequest.BodyPublishers.ofString(loginBody(email, password, totpCode)))
                .build(),
            HttpResponse.BodyHandlers.ofString()
        )

        check(response.statusCode() == 200) { "Login of [$email] failed with status ${response.statusCode()}" }

        val sessionId = cookieValue(response, SESSION_COOKIE)
            ?: error("The login of [$email] did not answer a session cookie")

        return "$SESSION_COOKIE=$sessionId; $CSRF_COOKIE=${cookieValue(response, CSRF_COOKIE) ?: csrfToken}"
    }

    private fun loginBody(email: String, password: String, totpCode: String?): String =
        totpCode?.let { """{"email": "$email", "password": "$password", "totpCode": "$it"}""" }
            ?: """{"email": "$email", "password": "$password"}"""

    private fun fetchCsrfToken(): String {

        val response = HTTP_CLIENT.send(
            HttpRequest.newBuilder(uri("/private/v1/auth/session")).GET().build(),
            HttpResponse.BodyHandlers.ofString()
        )

        return cookieValue(response, CSRF_COOKIE) ?: error("The server did not answer a CSRF cookie")
    }

    private fun cookieValue(response: HttpResponse<String>, name: String): String? = response.headers()
        .allValues("Set-Cookie")
        .firstOrNull { it.startsWith("$name=") }
        ?.substringBefore(";")
        ?.substringAfter("=")

    private fun uri(path: String): URI = URI.create("http://localhost:${environment.getRequiredProperty("local.server.port")}$path")

    companion object {
        const val OBJECT_NOT_FOUND_ERROR = "Invalid state, object not found"
        const val ADMIN_PASSWORD = "test-admin-password"
        const val TEST_PASSWORD = "test-user-password"

        private val ALL_ROLES = setOf("ADMINISTRATION", "REGISTRATION", "FINANCIAL", "DASHBOARDS")
        private val HTTP_CLIENT: HttpClient = HttpClient.newHttpClient()
    }
}
