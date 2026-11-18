package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.RestClientTestConfiguration.Companion.SESSION_COOKIE
import br.com.webbudget.server.TotpAndGoogleEnabled
import br.com.webbudget.server.domain.entities.administration.AuthProvider
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.security.CurrentUser
import br.com.webbudget.server.domain.services.administration.TotpService
import br.com.webbudget.server.domain.services.administration.UserService
import br.com.webbudget.server.infrastructure.config.security.GoogleLoginFailureHandler
import br.com.webbudget.server.infrastructure.config.security.GoogleLoginSuccessHandler
import br.com.webbudget.server.infrastructure.config.security.IpAttemptLimiter
import br.com.webbudget.server.infrastructure.repository.administration.TrustedDeviceRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.jooq.administration.tables.references.GRANTS
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import dev.samstevens.totp.code.DefaultCodeGenerator
import dev.samstevens.totp.time.SystemTimeProvider
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.env.Environment
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.mock.web.MockHttpSession
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContext
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.oauth2.core.user.DefaultOAuth2User
import org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.security.MessageDigest
import java.time.LocalDateTime
import java.util.HexFormat
import java.util.concurrent.atomic.AtomicInteger

@TotpAndGoogleEnabled
class GoogleAuthenticationTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var successHandler: GoogleLoginSuccessHandler

    @Autowired
    private lateinit var failureHandler: GoogleLoginFailureHandler

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var userService: UserService

    @Autowired
    private lateinit var totpService: TotpService

    @Autowired
    private lateinit var trustedDeviceRepository: TrustedDeviceRepository

    @Autowired
    private lateinit var ipAttemptLimiter: IpAttemptLimiter

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var environment: Environment

    private val googleEmails = mutableListOf<String>()

    private var address = ""

    override fun loginBeforeEach() {
        authenticateAnonymously()
    }

    @BeforeEach
    fun beSeenFromAnotherAddress() {
        address = nextAddress()
    }

    @AfterEach
    fun forgetGoogleAccountsAndTheContext() {
        SecurityContextHolder.clearContext()
        googleEmails.mapNotNull { userRepository.findByEmailIgnoreCase(it) }.forEach { userService.deleteAccount(it) }
        googleEmails.clear()
    }

    @Test
    fun `should tell the client that the google login is on`() {

        restTestClient.get()
            .uri("$AUTH_URL/config")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.googleAuthEnabled").isEqualTo(true)
    }

    @Test
    fun `should send the browser to google with the registered client`() {

        val response = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build().send(
            HttpRequest.newBuilder(URI.create("http://localhost:${port()}/private/oauth2/authorization/google")).GET().build(),
            HttpResponse.BodyHandlers.discarding()
        )

        val location = response.headers().firstValue("Location").orElseThrow()

        assertThat(response.statusCode()).isEqualTo(302)
        assertThat(location).startsWith("https://accounts.google.com/o/oauth2/v2/auth")
        assertThat(location).contains("client_id=test-google-client-id")
        assertThat(location).contains("scope=openid%20profile%20email")
        assertThat(location).contains("login/oauth2/code/google")
    }

    @Test
    fun `should send the failures of the oauth2 flow back to the login screen`() {

        val response = MockHttpServletResponse()

        failureHandler.onAuthenticationFailure(MockHttpServletRequest(), response, BadCredentialsException("denied"))

        assertThat(response.redirectedUrl).isEqualTo("http://client.test/login?error=oauth_failed")
    }

    @Test
    fun `should refuse an identity whose e-mail google did not verify`() {

        listOf<Any?>(false, "true", null).forEach { verified ->

            val signIn = signIn("sub-unverified", "unverified@example.com", verified = verified)

            assertThat(signIn.redirect).isEqualTo(OAUTH_FAILED)
            assertThat(signIn.session.isInvalid).isTrue()
            assertThat(signIn.principal).isNull()
            assertThat(userRepository.findByEmailIgnoreCase("unverified@example.com")).isNull()
        }
    }

    @Test
    fun `should refuse an identity without a subject or an e-mail`() {

        listOf(
            signIn(null, "no-subject@example.com"),
            signIn(" ", "blank-subject@example.com"),
            signIn("sub-no-email", null),
            signIn("sub-blank-email", " ")
        ).forEach { signIn ->
            assertThat(signIn.redirect).isEqualTo(OAUTH_FAILED)
            assertThat(signIn.principal).isNull()
        }

        assertThat(userRepository.findByGoogleSub("sub-no-email")).isNull()
        assertThat(userRepository.findByGoogleSub("sub-blank-email")).isNull()
    }

    @Test
    fun `should create a pending account without roles and tell the administrators`() {

        val signIn = signIn("sub-new", "New.Person@example.com", name = "New Person")

        assertThat(signIn.redirect).isEqualTo("http://client.test/")

        val user = userRepository.findByGoogleSub("sub-new")!!

        assertThat(user.email).isEqualTo("New.Person@example.com")
        assertThat(user.name).isEqualTo("New Person")
        assertThat(user.status).isEqualTo(UserStatus.PENDING)
        assertThat(user.authProvider).isEqualTo(AuthProvider.GOOGLE)
        assertThat(user.active).isTrue()
        assertThat(user.password).isNull()
        assertThat(user.grants).isEmpty()
        assertThat(dsl.fetchCount(GRANTS, GRANTS.ID_USER.eq(user.id))).isZero()

        assertThat(signIn.principal).isEqualTo(CurrentUser.from(user))
        assertThat(signIn.principal!!.status).isEqualTo(UserStatus.PENDING)

        assertThat(greenMail.receivedMessages.map { it.allRecipients.single().toString() })
            .containsExactly(User.ADMIN_USERNAME)
    }

    @Test
    fun `should open a session that waits for the approval when the linked account is pending`() {

        val user = createLoginUser(EMAIL, PASSWORD, "REGISTRATION")
        dsl.update(USERS).set(USERS.STATUS, "PENDING").where(USERS.ID.eq(user.id)).execute()

        openSessionByLinking(EMAIL)

        restTestClient.get().uri("$AUTH_URL/session").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PENDING")

        restTestClient.get().uri("/private/v1/registration/wallets").exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("pending_approval")
    }

    @Test
    fun `should open the session of a known google account without asking for the code`() {

        val user = createLoginUser(EMAIL, PASSWORD)
        val secret = totpService.generateSecret()
        userRepository.updateTotpSecret(user.id!!, secret)
        userRepository.enableTotp(user.id!!, secret)
        userRepository.linkGoogleAccount(userRepository.findByEmail(EMAIL)!!, "sub-known")

        val signIn = signIn("sub-known", EMAIL)

        assertThat(signIn.redirect).isEqualTo("http://client.test/")
        assertThat(signIn.principal!!.email).isEqualTo(EMAIL)
        assertThat(signIn.principal!!.authProvider).isEqualTo(AuthProvider.GOOGLE)
    }

    @Test
    fun `should refuse a known google account that is blocked or inactive`() {

        val user = createLoginUser(EMAIL, PASSWORD)
        userRepository.linkGoogleAccount(user, "sub-disabled")

        dsl.update(USERS).set(USERS.STATUS, "BLOCKED").where(USERS.ID.eq(user.id)).execute()

        assertThat(signIn("sub-disabled", EMAIL).redirect).isEqualTo(OAUTH_FAILED)

        dsl.update(USERS).set(USERS.STATUS, "APPROVED").set(USERS.ACTIVE, false).where(USERS.ID.eq(user.id)).execute()

        val signIn = signIn("sub-disabled", EMAIL)

        assertThat(signIn.redirect).isEqualTo(OAUTH_FAILED)
        assertThat(signIn.principal).isNull()
        assertThat(signIn.session.isInvalid).isTrue()
    }

    @Test
    fun `should not log in nor create anything when the e-mail belongs to a local account`() {

        createLoginUser("Mixed.Case@webbudget.com.br", PASSWORD)

        val signIn = signIn("sub-collision", "mixed.case@webbudget.com.br")

        assertThat(signIn.redirect).startsWith("http://client.test/login?error=email_in_use&linkToken=")
        assertThat(signIn.redirect.substringAfter("linkToken=")).hasSizeGreaterThanOrEqualTo(43)
        assertThat(signIn.redirect).doesNotContain("webbudget.com.br")
        assertThat(signIn.principal).isNull()
        assertThat(signIn.session.isInvalid).isTrue()
        assertThat(userRepository.findByGoogleSub("sub-collision")).isNull()
        assertThat(dsl.fetchCount(USERS, USERS.EMAIL.equalIgnoreCase("mixed.case@webbudget.com.br"))).isEqualTo(1)
    }

    @Test
    fun `should not offer to link an e-mail that already belongs to another google identity`() {

        signIn("sub-original", "taken@example.com")

        val signIn = signIn("sub-impostor", "taken@example.com")

        assertThat(signIn.redirect).isEqualTo(OAUTH_FAILED)
        assertThat(signIn.principal).isNull()
        assertThat(userRepository.findByGoogleSub("sub-impostor")).isNull()
    }

    @Test
    fun `should link the account with the password and replace it with the google identity`() {

        val user = createLoginUser(EMAIL, PASSWORD, "FINANCIAL")
        val token = startLink(EMAIL)

        postLink(token, PASSWORD)
            .expectStatus().isOk
            .expectHeader().values("Set-Cookie") { cookies -> assertThat(cookies.any { it.startsWith("$SESSION_COOKIE=") }).isTrue() }
            .expectBody()
            .jsonPath("$.email").isEqualTo(EMAIL)
            .jsonPath("$.roles[0]").isEqualTo("FINANCIAL")

        val linked = userRepository.findByEmail(EMAIL)!!

        assertThat(linked.googleSub).isEqualTo("sub-link")
        assertThat(linked.authProvider).isEqualTo(AuthProvider.GOOGLE)
        assertThat(linked.password).isNull()
        assertThat(linked.credentialsVersion).isEqualTo(user.credentialsVersion + 1)
        assertThat(linked.grants).hasSize(1)

        postLogin(EMAIL, PASSWORD).expectStatus().isUnauthorized.expectBody().jsonPath("$.error").isEqualTo("invalid-credentials")
    }

    @Test
    fun `should open a session that survives the next request after the link`() {

        createLoginUser(EMAIL, PASSWORD, "FINANCIAL")

        openSessionByLinking(EMAIL)

        restTestClient.get().uri("$AUTH_URL/session").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.email").isEqualTo(EMAIL)
    }

    @Test
    fun `should end the sessions that were open before the link`() {

        val secret = createTotpUser(EMAIL)
        val oldSession = login(EMAIL, PASSWORD, codeFor(secret))
        val token = startLink(EMAIL)

        postLink(token, PASSWORD, code = codeFor(secret)).expectStatus().isOk

        sessionCookies.header = oldSession

        restTestClient.get().uri("$AUTH_URL/session").exchange()
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("session-revoked")
    }

    @Test
    fun `should burn the link token when the password is wrong`() {

        createLoginUser(EMAIL, PASSWORD)
        val token = startLink(EMAIL)

        postLink(token, "wrong-password")
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")

        postLink(token, PASSWORD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_google_link_token")

        assertThat(userRepository.findByEmail(EMAIL)!!.googleSub).isNull()
    }

    @Test
    fun `should refuse an unknown link token`() {

        postLink("an-unknown-token", PASSWORD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_google_link_token")
    }

    @Test
    fun `should refuse a link request without the required fields`() {

        post("google/link", """{"linkToken": "", "password": ""}""").expectStatus().isEqualTo(422)
        post("google/link", """{"password": "$PASSWORD"}""").expectStatus().isEqualTo(422)
    }

    @Test
    fun `should require the csrf token on the link`() {

        restTestClient.post()
            .uri("$AUTH_URL/google/link")
            .header("X-Test-Skip-Csrf-Token", "true")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"linkToken": "any-token", "password": "$PASSWORD"}""")
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-csrf-token")
    }

    @Test
    fun `should ask for the code before linking an account that has the totp on and keep the token`() {

        val secret = createTotpUser(EMAIL)
        val token = startLink(EMAIL)

        postLink(token, PASSWORD)
            .expectStatus().isAccepted
            .expectHeader().doesNotExist("Set-Cookie")
            .expectBody()
            .jsonPath("$.status").isEqualTo("needs_totp")

        assertThat(userRepository.findByEmail(EMAIL)!!.googleSub).isNull()

        postLink(token, PASSWORD, code = codeFor(secret)).expectStatus().isOk

        assertThat(userRepository.findByEmail(EMAIL)!!.googleSub).isEqualTo("sub-link")
    }

    @Test
    fun `should burn the link token when the code is wrong`() {

        val secret = createTotpUser(EMAIL)
        val token = startLink(EMAIL)

        postLink(token, PASSWORD, code = wrongCodeFor(secret))
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_totp_code")

        postLink(token, PASSWORD, code = codeFor(secret))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_google_link_token")
    }

    @Test
    fun `should not ask for the code on a trusted device`() {

        createTotpUser(EMAIL)
        val token = startLink(EMAIL)

        val deviceToken = "a-trusted-device-token"
        val now = LocalDateTime.now()
        trustedDeviceRepository.insert(userRepository.findByEmail(EMAIL)!!.id!!, sha256(deviceToken), "Firefox", now.plusDays(1), now)

        postLink(token, PASSWORD, deviceToken = deviceToken).expectStatus().isOk
    }

    @Test
    fun `should answer too many attempts without burning the token`() {

        createLoginUser(EMAIL, PASSWORD)
        val token = startLink(EMAIL)

        repeat(IP_MAX_ATTEMPTS) { ipAttemptLimiter.recordFailure(address) }

        postLink(token, PASSWORD)
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_login_attempts")

        address = nextAddress()

        postLink(token, PASSWORD).expectStatus().isOk
    }

    @Test
    fun `should burn the link token of an account that is blocked`() {

        val user = createLoginUser(EMAIL, PASSWORD)
        val token = startLink(EMAIL)

        dsl.update(USERS).set(USERS.STATUS, "BLOCKED").where(USERS.ID.eq(user.id)).execute()

        postLink(token, PASSWORD)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("account-disabled")

        postLink(token, PASSWORD).expectStatus().isBadRequest
    }

    @Test
    fun `should not link an account that was deleted after the token was issued`() {

        val user = createLoginUser(EMAIL, PASSWORD)
        val token = startLink(EMAIL)

        userService.deleteAccount(user)

        postLink(token, PASSWORD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_google_link_token")
    }

    @Test
    fun `should not link a google identity that another account took meanwhile`() {

        createLoginUser(EMAIL, PASSWORD)
        val other = createLoginUser(OTHER_EMAIL, PASSWORD)
        val token = startLink(EMAIL)

        userRepository.linkGoogleAccount(other, "sub-link")

        postLink(token, PASSWORD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_google_link_token")

        assertThat(userRepository.findByEmail(EMAIL)!!.googleSub).isNull()
    }

    @Test
    fun `should not link an account that stopped being local meanwhile`() {

        val user = createLoginUser(EMAIL, PASSWORD)
        val token = startLink(EMAIL)

        dsl.update(USERS).set(USERS.AUTH_PROVIDER, "GOOGLE").where(USERS.ID.eq(user.id)).execute()

        postLink(token, PASSWORD)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_google_link_token")
    }

    @Test
    fun `should never accept a password for an account that has none`() {

        signIn("sub-no-password", "no-password@example.com")

        postLogin("no-password@example.com", UNKNOWN_USER_PASSWORD)
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")

        post("totp/enroll", """{"email": "no-password@example.com", "password": "$UNKNOWN_USER_PASSWORD"}""")
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")

        post("totp/verify", """{"email": "no-password@example.com", "password": "$UNKNOWN_USER_PASSWORD", "code": "123456"}""")
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")
    }

    private fun signIn(
        subject: String?,
        email: String?,
        name: String? = "Google Person",
        verified: Any? = true
    ): GoogleSignIn {

        val attributes = mutableMapOf<String, Any>("placeholder" to "value")
        subject?.let { attributes["sub"] = it }
        email?.let { attributes["email"] = it }
        name?.let { attributes["name"] = it }
        verified?.let { attributes["email_verified"] = it }

        email?.let { googleEmails.add(it) }

        val authorities = listOf(SimpleGrantedAuthority("OAUTH2_USER"))
        val authentication = OAuth2AuthenticationToken(DefaultOAuth2User(authorities, attributes, "placeholder"), authorities, "google")

        val session = MockHttpSession()
        val request = MockHttpServletRequest().apply { this.session = session }
        val response = MockHttpServletResponse()

        successHandler.onAuthenticationSuccess(request, response, authentication)

        return GoogleSignIn(session, response)
    }

    private fun openSessionByLinking(email: String) {

        val token = startLink(email)

        var sessionCookie = ""

        postLink(token, PASSWORD)
            .expectStatus().isOk
            .expectHeader().values("Set-Cookie") { cookies -> sessionCookie = cookies.first { it.startsWith("$SESSION_COOKIE=") } }

        sessionCookies.header = "${sessionCookie.substringBefore(";")}; ${sessionCookies.header}"
    }

    private fun startLink(email: String): String {

        val signIn = signIn("sub-link", email)

        assertThat(signIn.redirect).contains("error=email_in_use")

        return signIn.redirect.substringAfter("linkToken=")
    }

    private fun createTotpUser(email: String): String {

        val user = createLoginUser(email, PASSWORD)
        val secret = totpService.generateSecret()

        userRepository.updateTotpSecret(user.id!!, secret)
        userRepository.enableTotp(user.id!!, secret)

        return secret
    }

    private fun postLink(
        token: String,
        password: String,
        code: String? = null,
        deviceToken: String? = null
    ): ResponseSpec {

        val fields = listOfNotNull(
            """"linkToken": "$token"""",
            """"password": "$password"""",
            code?.let { """"totpCode": "$it"""" }
        ).joinToString(", ")

        val request = restTestClient.post()
            .uri("$AUTH_URL/google/link")
            .header("X-Forwarded-For", address)
            .contentType(MediaType.APPLICATION_JSON)

        deviceToken?.let { request.header("Cookie", "${sessionCookies.header}; trusted_device=$it") }

        return request.body("{$fields}").exchange()
    }

    private fun postLogin(email: String, password: String): ResponseSpec =
        post("login", """{"email": "$email", "password": "$password"}""")

    private fun post(path: String, body: String): ResponseSpec = restTestClient.post()
        .uri("$AUTH_URL/$path")
        .header("X-Forwarded-For", address)
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun port(): String = environment.getRequiredProperty("local.server.port")

    private fun codeFor(secret: String): String =
        DefaultCodeGenerator().generate(secret, Math.floorDiv(SystemTimeProvider().time, TIME_STEP_IN_SECONDS))

    private fun wrongCodeFor(secret: String): String {

        val step = Math.floorDiv(SystemTimeProvider().time, TIME_STEP_IN_SECONDS)
        val validCodes = (-1L..1L).map { DefaultCodeGenerator().generate(secret, step + it) }.toSet()

        return (0..999_999).map { "%06d".format(it) }.first { it !in validCodes }
    }

    private fun sha256(value: String): String =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8)))

    private fun nextAddress(): String = "203.0.113.${ADDRESS_COUNTER.incrementAndGet() % 250 + 1}"

    private class GoogleSignIn(
        val session: MockHttpSession,
        private val response: MockHttpServletResponse
    ) {

        val redirect: String get() = response.redirectedUrl!!

        val principal: CurrentUser?
            get() = session.takeUnless { it.isInvalid }
                ?.let { (it.getAttribute(SPRING_SECURITY_CONTEXT_KEY) as? SecurityContext)?.authentication?.principal as? CurrentUser }
    }

    companion object {
        private const val AUTH_URL = "/private/v1/auth"
        private const val EMAIL = "google-link@webbudget.com.br"
        private const val OTHER_EMAIL = "google-other@webbudget.com.br"
        private const val PASSWORD = "google-password"
        private const val UNKNOWN_USER_PASSWORD = "unknown-user-password"
        private const val OAUTH_FAILED = "http://client.test/login?error=oauth_failed"
        private const val IP_MAX_ATTEMPTS = 5
        private const val TIME_STEP_IN_SECONDS = 30L

        private val ADDRESS_COUNTER = AtomicInteger()
    }
}
