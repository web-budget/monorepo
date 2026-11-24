package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.TotpAndGoogleEnabled
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.services.administration.TotpService
import br.com.webbudget.server.domain.services.administration.UserService
import br.com.webbudget.server.infrastructure.config.security.AttemptKeys
import br.com.webbudget.server.infrastructure.config.security.IpAttemptLimiter
import br.com.webbudget.server.infrastructure.config.security.TotpAttemptLimiter
import br.com.webbudget.server.infrastructure.repository.administration.TrustedDeviceRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.jooq.administration.tables.references.TRUSTED_DEVICES
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import dev.samstevens.totp.code.DefaultCodeGenerator
import dev.samstevens.totp.time.SystemTimeProvider
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.time.LocalDateTime
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger

@TotpAndGoogleEnabled
class TotpAuthenticationTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var userService: UserService

    @Autowired
    private lateinit var totpService: TotpService

    @Autowired
    private lateinit var trustedDeviceRepository: TrustedDeviceRepository

    @Autowired
    private lateinit var totpAttemptLimiter: TotpAttemptLimiter

    @Autowired
    private lateinit var ipAttemptLimiter: IpAttemptLimiter

    private lateinit var adminSecret: String

    private var address = ""

    override fun loginBeforeEach() {
        forgetAdministratorTotp()
        adminSecret = totpService.generateSecret()
        enableTotp(User.ADMIN_USERNAME, adminSecret)
        sessionCookies.header = login(User.ADMIN_USERNAME, ADMIN_PASSWORD, codeFor(adminSecret))
    }

    @BeforeEach
    fun beSeenFromAnotherAddress() {
        nextAddress()
    }

    @AfterEach
    fun forgetAdministratorTotp() {
        val admin = userRepository.findByEmail(User.ADMIN_USERNAME)!!
        trustedDeviceRepository.deleteByUserId(admin.id!!)
        userRepository.resetTotp(admin.id!!)
    }

    @Test
    fun `should tell on the session that the totp is on and that the installation asks for it`() {

        restTestClient.get()
            .uri("/private/v1/auth/session")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totpEnabled").isEqualTo(true)
            .jsonPath("$.totpRequired").isEqualTo(true)
    }

    @Test
    fun `should ask a user without totp to enroll before any session exists`() {

        createLoginUser(EMAIL, PASSWORD)
        authenticateAnonymously()

        postLogin(EMAIL, PASSWORD)
            .expectStatus().isAccepted
            .expectHeader().doesNotExist("Set-Cookie")
            .expectBody()
            .jsonPath("$.status").isEqualTo("needs_enrollment")
    }

    @Test
    fun `should enroll with a qr code and keep the totp off until the first code is confirmed`() {

        val user = createLoginUser(EMAIL, PASSWORD)
        authenticateAnonymously()

        val secret = enroll(EMAIL, PASSWORD)

        assertThat(storedSecret(user)).isEqualTo(secret)
        assertThat(totpEnabled(user)).isFalse()

        post("totp/verify", """{"email": "$EMAIL", "password": "$PASSWORD", "code": "${wrongCodeFor(secret)}"}""")
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_totp_code")

        assertThat(totpEnabled(user)).isFalse()

        post("totp/verify", """{"email": "$EMAIL", "password": "$PASSWORD", "code": "${codeFor(secret)}"}""")
            .expectStatus().isOk
            .expectHeader().values("Set-Cookie") { cookies -> assertThat(cookies.any { it.startsWith("JSESSIONID=") }).isTrue() }
            .expectBody()
            .jsonPath("$.email").isEqualTo(EMAIL)

        assertThat(totpEnabled(user)).isTrue()
    }

    @Test
    fun `should answer the qr code as a png image`() {

        createLoginUser(EMAIL, PASSWORD)
        authenticateAnonymously()

        post("totp/enroll", """{"email": "$EMAIL", "password": "$PASSWORD"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.secretKey").isNotEmpty
            .jsonPath("$.qrCodeDataUri").value<String> { assertThat(it).startsWith("data:image/png;base64,") }
    }

    @Test
    fun `should refuse to enroll or confirm when the totp is already enabled`() {

        createTotpUser(EMAIL)
        authenticateAnonymously()

        post("totp/enroll", """{"email": "$EMAIL", "password": "$PASSWORD"}""")
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("totp_already_enabled")

        post("totp/verify", """{"email": "$EMAIL", "password": "$PASSWORD", "code": "123456"}""")
            .expectStatus().isEqualTo(409)
    }

    @Test
    fun `should refuse to enroll with the wrong password`() {

        createLoginUser(EMAIL, PASSWORD)
        authenticateAnonymously()

        post("totp/enroll", """{"email": "$EMAIL", "password": "wrong-password"}""")
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")
    }

    @Test
    fun `should refuse to confirm a totp that was never started`() {

        createLoginUser(EMAIL, PASSWORD)
        authenticateAnonymously()

        post("totp/verify", """{"email": "$EMAIL", "password": "$PASSWORD", "code": "123456"}""")
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_totp_code")
    }

    @Test
    fun `should replace the secret of an enrollment that was never confirmed`() {

        val user = createLoginUser(EMAIL, PASSWORD)
        authenticateAnonymously()

        val first = enroll(EMAIL, PASSWORD)
        val second = enroll(EMAIL, PASSWORD)

        assertThat(second).isNotEqualTo(first)
        assertThat(storedSecret(user)).isEqualTo(second)
    }

    @Test
    fun `should ask for the code after the password and open the session only with a valid one`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        postLogin(EMAIL, PASSWORD)
            .expectStatus().isAccepted
            .expectHeader().doesNotExist("Set-Cookie")
            .expectBody()
            .jsonPath("$.status").isEqualTo("needs_totp")

        postLogin(EMAIL, PASSWORD, code = wrongCodeFor(secret))
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid_totp_code")

        postLogin(EMAIL, PASSWORD, code = codeFor(secret))
            .expectStatus().isOk
            .expectHeader().values("Set-Cookie") { cookies -> assertThat(cookies.any { it.startsWith("JSESSIONID=") }).isTrue() }
            .expectBody()
            .jsonPath("$.email").isEqualTo(EMAIL)
    }

    @Test
    fun `should not ask for the code when the password is wrong`() {

        createTotpUser(EMAIL)
        authenticateAnonymously()

        postLogin(EMAIL, "wrong-password")
            .expectStatus().isUnauthorized
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-credentials")
    }

    @Test
    fun `should not trust the device unless the user asks for it`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        postLogin(EMAIL, PASSWORD, code = codeFor(secret))
            .expectStatus().isOk
            .expectHeader().values("Set-Cookie") { cookies -> assertThat(cookies.none { it.startsWith("trusted_device=") }).isTrue() }

        assertThat(trustedDeviceCount()).isZero()
    }

    @Test
    fun `should skip the code on a trusted device and keep only the hash of the token`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        val cookie = trustDevice(EMAIL, secret)

        assertThat(cookie).containsIgnoringCase("HttpOnly")
        assertThat(cookie).containsIgnoringCase("SameSite=Lax")
        assertThat(cookie).contains("Path=/private/v1/auth")
        assertThat(cookie).containsIgnoringCase("Max-Age=2592000")

        val token = cookieToken(cookie)
        val storedHash = dsl.select(TRUSTED_DEVICES.TOKEN_HASH).from(TRUSTED_DEVICES).fetchSingle(TRUSTED_DEVICES.TOKEN_HASH)!!

        assertThat(storedHash).hasSize(64).isNotEqualTo(token)
        assertThat(dsl.select(TRUSTED_DEVICES.LABEL).from(TRUSTED_DEVICES).fetchSingle(TRUSTED_DEVICES.LABEL)).isEqualTo("Firefox · Linux")

        postLogin(EMAIL, PASSWORD, deviceToken = token).expectStatus().isOk
    }

    @Test
    fun `should still ask for the code when the device cookie belongs to another user`() {

        val secret = createTotpUser(EMAIL)
        createTotpUser(OTHER_EMAIL)
        authenticateAnonymously()

        val token = cookieToken(trustDevice(EMAIL, secret))

        postLogin(OTHER_EMAIL, PASSWORD, deviceToken = token)
            .expectStatus().isAccepted
            .expectBody()
            .jsonPath("$.status").isEqualTo("needs_totp")
    }

    @Test
    fun `should still ask for the code when the device cookie is unknown or expired`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        postLogin(EMAIL, PASSWORD, deviceToken = "an-unknown-token").expectStatus().isAccepted

        val token = cookieToken(trustDevice(EMAIL, secret))

        dsl.update(TRUSTED_DEVICES).set(TRUSTED_DEVICES.EXPIRES_ON, LocalDateTime.now().minusDays(1)).execute()

        postLogin(EMAIL, PASSWORD, deviceToken = token).expectStatus().isAccepted
    }

    @Test
    fun `should still ask for the wrong code on a device that is not trusted`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        postLogin(EMAIL, PASSWORD, code = wrongCodeFor(secret), trustDevice = true)
            .expectStatus().isUnauthorized
            .expectHeader().doesNotExist("Set-Cookie")

        assertThat(trustedDeviceCount()).isZero()
    }

    @Test
    fun `should list and revoke the trusted devices of the session user`() {

        val secret = createTotpUser(EMAIL)
        createTotpUser(OTHER_EMAIL)
        authenticateAnonymously()

        val token = cookieToken(trustDevice(EMAIL, secret))
        trustDevice(EMAIL, secret)
        trustDevice(OTHER_EMAIL, otherSecret())

        authenticateAs(EMAIL, PASSWORD, secret)

        restTestClient.get()
            .uri("$AUTH_URL/trusted-devices")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(2)
            .jsonPath("$[0].label").isEqualTo("Firefox · Linux")
            .jsonPath("$[0].id").isNotEmpty
            .jsonPath("$[0].expiresOn").isNotEmpty
            .jsonPath("$[0].tokenHash").doesNotExist()

        val deviceId = dsl.select(TRUSTED_DEVICES.EXTERNAL_ID)
            .from(TRUSTED_DEVICES)
            .where(TRUSTED_DEVICES.ID_USER.eq(userId(EMAIL)))
            .fetch(TRUSTED_DEVICES.EXTERNAL_ID)
            .first()

        restTestClient.delete().uri("$AUTH_URL/trusted-devices/$deviceId").exchange().expectStatus().isOk

        restTestClient.get().uri("$AUTH_URL/trusted-devices").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)

        restTestClient.delete().uri("$AUTH_URL/trusted-devices/${UUID.randomUUID()}").exchange().expectStatus().isNotFound

        restTestClient.delete().uri("$AUTH_URL/trusted-devices").exchange().expectStatus().isOk

        restTestClient.get().uri("$AUTH_URL/trusted-devices").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(0)

        assertThat(trustedDeviceCount()).isEqualTo(1)
        assertThat(token).isNotEmpty()
    }

    @Test
    fun `should not let a user revoke the device of someone else`() {

        createTotpUser(EMAIL)
        val secret = createTotpUser(OTHER_EMAIL)
        authenticateAnonymously()

        trustDevice(OTHER_EMAIL, secret)

        val deviceId = dsl.select(TRUSTED_DEVICES.EXTERNAL_ID).from(TRUSTED_DEVICES).fetchSingle(TRUSTED_DEVICES.EXTERNAL_ID)

        val ownSecret = dsl.select(USERS.TOTP_SECRET).from(USERS).where(USERS.EMAIL.eq(EMAIL)).fetchSingle(USERS.TOTP_SECRET)!!
        authenticateAs(EMAIL, PASSWORD, ownSecret)

        restTestClient.delete().uri("$AUTH_URL/trusted-devices/$deviceId").exchange().expectStatus().isNotFound

        assertThat(trustedDeviceCount()).isEqualTo(1)
    }

    @Test
    fun `should require a session to list the trusted devices`() {

        authenticateAnonymously()

        restTestClient.get().uri("$AUTH_URL/trusted-devices").exchange().expectStatus().isUnauthorized
    }

    @Test
    fun `should reset the totp of a user and drop the trusted devices in one go`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        val token = cookieToken(trustDevice(EMAIL, secret))
        val user = userRepository.findByEmail(EMAIL)!!

        authenticateAs(User.ADMIN_USERNAME, ADMIN_PASSWORD, adminSecret)

        resetTotp(user.externalId!!).expectStatus().isOk

        assertThat(totpEnabled(user)).isFalse()
        assertThat(storedSecret(user)).isNull()
        assertThat(trustedDeviceCount()).isZero()

        authenticateAnonymously()

        postLogin(EMAIL, PASSWORD, deviceToken = token)
            .expectStatus().isAccepted
            .expectBody()
            .jsonPath("$.status").isEqualTo("needs_enrollment")
    }

    @Test
    fun `should not touch the devices of other users when resetting the totp`() {

        val secret = createTotpUser(EMAIL)
        val otherSecret = createTotpUser(OTHER_EMAIL)
        authenticateAnonymously()

        trustDevice(EMAIL, secret)
        trustDevice(OTHER_EMAIL, otherSecret)

        authenticateAs(User.ADMIN_USERNAME, ADMIN_PASSWORD, adminSecret)

        resetTotp(userRepository.findByEmail(EMAIL)!!.externalId!!).expectStatus().isOk

        assertThat(trustedDeviceCount()).isEqualTo(1)
        assertThat(totpEnabled(userRepository.findByEmail(OTHER_EMAIL)!!)).isTrue()
    }

    @Test
    fun `should only let the administration reset a totp and never on the own account`() {

        val user = createTotpUser(EMAIL).let { userRepository.findByEmail(EMAIL)!! }

        resetTotp(userRepository.findByEmail(User.ADMIN_USERNAME)!!.externalId!!)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("self-action-not-allowed")

        resetTotp(UUID.randomUUID()).expectStatus().isNotFound

        authenticateAs(EMAIL, PASSWORD, storedSecret(user)!!)
        createTotpUser(OTHER_EMAIL)

        resetTotp(userRepository.findByEmail(OTHER_EMAIL)!!.externalId!!).expectStatus().isForbidden

        assertThat(totpEnabled(userRepository.findByEmail(OTHER_EMAIL)!!)).isTrue()
    }

    @Test
    fun `should show whether the totp is enabled on the user view and never the secret`() {

        val user = createTotpUser(EMAIL).let { userRepository.findByEmail(EMAIL)!! }
        createLoginUser(OTHER_EMAIL, PASSWORD)

        restTestClient.get().uri("/private/v1/administration/users/${user.externalId}").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totpEnabled").isEqualTo(true)
            .jsonPath("$.totpSecret").doesNotExist()
            .jsonPath("$.totp_secret").doesNotExist()
            .jsonPath("$.secret").doesNotExist()

        restTestClient.get().uri("/private/v1/administration/users/${userRepository.findByEmail(OTHER_EMAIL)!!.externalId}").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totpEnabled").isEqualTo(false)
    }

    @Test
    fun `should delete a user that has trusted devices`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        trustDevice(EMAIL, secret)

        userService.deleteAccount(userRepository.findByEmail(EMAIL)!!)

        assertThat(userRepository.findByEmail(EMAIL)).isNull()
        assertThat(trustedDeviceCount()).isZero()
    }

    @Test
    fun `should lock the pair after too many wrong codes even with the right code`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        repeat(TOTP_MAX_ATTEMPTS) {
            postLogin(EMAIL, PASSWORD, code = wrongCodeFor(secret)).expectStatus().isUnauthorized
        }

        postLogin(EMAIL, PASSWORD, code = codeFor(secret))
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_totp_attempts")
    }

    @Test
    fun `should not lock the same e-mail on another address`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        val lockedAddress = address

        repeat(TOTP_MAX_ATTEMPTS) { totpAttemptLimiter.recordFailure(AttemptKeys.of(EMAIL, lockedAddress)) }

        nextAddress()

        postLogin(EMAIL, PASSWORD, code = codeFor(secret)).expectStatus().isOk
    }

    @Test
    fun `should not reset the totp counter with a good password`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        repeat(TOTP_MAX_ATTEMPTS - 1) {
            postLogin(EMAIL, PASSWORD, code = wrongCodeFor(secret)).expectStatus().isUnauthorized
        }

        postLogin(EMAIL, PASSWORD).expectStatus().isAccepted

        postLogin(EMAIL, PASSWORD, code = wrongCodeFor(secret)).expectStatus().isUnauthorized

        postLogin(EMAIL, PASSWORD, code = codeFor(secret)).expectStatus().isEqualTo(429)
    }

    @Test
    fun `should forget the wrong codes of the pair after a right one`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        repeat(TOTP_MAX_ATTEMPTS - 1) {
            postLogin(EMAIL, PASSWORD, code = wrongCodeFor(secret)).expectStatus().isUnauthorized
        }

        postLogin(EMAIL, PASSWORD, code = codeFor(secret)).expectStatus().isOk

        repeat(TOTP_MAX_ATTEMPTS - 1) {
            postLogin(EMAIL, PASSWORD, code = wrongCodeFor(secret)).expectStatus().isUnauthorized
        }

        postLogin(EMAIL, PASSWORD, code = codeFor(secret)).expectStatus().isOk
    }

    @Test
    fun `should count the wrong codes against the address as well`() {

        val secret = createTotpUser(EMAIL)
        authenticateAnonymously()

        repeat(IP_MAX_ATTEMPTS - 1) { ipAttemptLimiter.recordFailure(address) }

        postLogin(EMAIL, PASSWORD, code = wrongCodeFor(secret)).expectStatus().isUnauthorized

        postLogin(EMAIL, PASSWORD, code = codeFor(secret))
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_login_attempts")
    }

    @Test
    fun `should lock the confirmation of the enrollment after too many wrong codes`() {

        createLoginUser(EMAIL, PASSWORD)
        authenticateAnonymously()

        val secret = enroll(EMAIL, PASSWORD)

        repeat(TOTP_MAX_ATTEMPTS) {
            post("totp/verify", """{"email": "$EMAIL", "password": "$PASSWORD", "code": "${wrongCodeFor(secret)}"}""")
                .expectStatus().isUnauthorized
        }

        post("totp/verify", """{"email": "$EMAIL", "password": "$PASSWORD", "code": "${codeFor(secret)}"}""")
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_totp_attempts")
    }

    @Test
    fun `should refuse the enrollment of an address that reached its limit`() {

        createLoginUser(EMAIL, PASSWORD)
        authenticateAnonymously()

        repeat(IP_MAX_ATTEMPTS) { ipAttemptLimiter.recordFailure(address) }

        post("totp/enroll", """{"email": "$EMAIL", "password": "$PASSWORD"}""")
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_login_attempts")
    }

    @Test
    fun `should refuse an enrollment request without the required fields`() {

        authenticateAnonymously()

        post("totp/enroll", """{"email": "not-an-email"}""").expectStatus().isEqualTo(422)
        post("totp/verify", """{"email": "$EMAIL", "password": "$PASSWORD"}""").expectStatus().isEqualTo(422)
    }

    @Test
    fun `should require the csrf token on the enrollment`() {

        authenticateAnonymously()

        restTestClient.post()
            .uri("$AUTH_URL/totp/enroll")
            .header("X-Test-Skip-Csrf-Token", "true")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"email": "$EMAIL", "password": "$PASSWORD"}""")
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-csrf-token")
    }


    private fun nextAddress() {
        address = "198.51.100.${ADDRESS_COUNTER.incrementAndGet() % 250 + 1}"
    }

    private fun createTotpUser(email: String): String {

        createLoginUser(email, PASSWORD)

        val secret = totpService.generateSecret()

        enableTotp(email, secret)

        return secret
    }

    private fun otherSecret(): String = dsl.select(USERS.TOTP_SECRET).from(USERS).where(USERS.EMAIL.eq(OTHER_EMAIL)).fetchSingle(USERS.TOTP_SECRET)!!

    private fun enableTotp(email: String, secret: String) {
        val id = userId(email)
        userRepository.updateTotpSecret(id, secret)
        userRepository.enableTotp(id, secret)
    }

    private fun userId(email: String): Long = userRepository.findByEmail(email)!!.id!!

    private fun storedSecret(user: User): String? = userRepository.findTotpSecret(user.id!!)

    private fun totpEnabled(user: User): Boolean = userRepository.findByEmail(user.email)!!.totpEnabled

    private fun trustedDeviceCount(): Int = dsl.fetchCount(TRUSTED_DEVICES)

    private fun codeFor(secret: String): String =
        DefaultCodeGenerator().generate(secret, Math.floorDiv(SystemTimeProvider().time, TIME_STEP_IN_SECONDS))

    private fun wrongCodeFor(secret: String): String {

        val step = Math.floorDiv(SystemTimeProvider().time, TIME_STEP_IN_SECONDS)
        val validCodes = (-1L..1L).map { DefaultCodeGenerator().generate(secret, step + it) }.toSet()

        return (0..999_999).map { "%06d".format(it) }.first { it !in validCodes }
    }

    private fun enroll(email: String, password: String): String {

        var secret = ""

        post("totp/enroll", """{"email": "$email", "password": "$password"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.secretKey").value<String> { secret = it }

        return secret
    }

    private fun trustDevice(email: String, secret: String): String {

        var cookie = ""

        postLogin(email, PASSWORD, code = codeFor(secret), trustDevice = true)
            .expectStatus().isOk
            .expectHeader().values("Set-Cookie") { cookies -> cookie = cookies.first { it.startsWith("trusted_device=") } }

        return cookie
    }

    private fun cookieToken(setCookie: String): String = setCookie.substringBefore(";").substringAfter("=")

    private fun authenticateAs(email: String, password: String, secret: String) {
        sessionCookies.header = login(email, password, codeFor(secret))
    }

    private fun resetTotp(id: UUID): ResponseSpec = restTestClient.patch()
        .uri("/private/v1/administration/users/$id/totp-reset")
        .exchange()

    private fun post(path: String, body: String): ResponseSpec = restTestClient.post()
        .uri("$AUTH_URL/$path")
        .header("X-Forwarded-For", address)
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun postLogin(
        email: String,
        password: String,
        code: String? = null,
        trustDevice: Boolean = false,
        deviceToken: String? = null
    ): ResponseSpec {

        val fields = listOfNotNull(
            """"email": "$email"""",
            """"password": "$password"""",
            code?.let { """"totpCode": "$it"""" },
            """"trustDevice": $trustDevice"""
        ).joinToString(", ")

        val request = restTestClient.post()
            .uri("$AUTH_URL/login")
            .header("User-Agent", USER_AGENT)
            .header("X-Forwarded-For", address)
            .contentType(MediaType.APPLICATION_JSON)

        deviceToken?.let { request.header("Cookie", "${sessionCookies.header}; trusted_device=$it") }

        return request.body("{$fields}").exchange()
    }

    companion object {
        private const val AUTH_URL = "/private/v1/auth"
        private const val EMAIL = "totp@webbudget.com.br"
        private const val OTHER_EMAIL = "totp-other@webbudget.com.br"
        private const val PASSWORD = "totp-password"
        private const val TOTP_MAX_ATTEMPTS = 3
        private const val IP_MAX_ATTEMPTS = 5
        private const val TIME_STEP_IN_SECONDS = 30L
        private const val USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"

        private val ADDRESS_COUNTER = AtomicInteger()
    }
}
