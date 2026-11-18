package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.AuthProvider
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.services.administration.UserService
import br.com.webbudget.server.infrastructure.config.security.RegistrationAttemptLimiter
import br.com.webbudget.server.infrastructure.config.security.SecurityProperties
import br.com.webbudget.server.infrastructure.repository.administration.AccountActivationAttemptRepository
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import org.springframework.test.json.JsonCompareMode
import java.util.UUID

class AccountRegistrationTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var userService: UserService

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var securityProperties: SecurityProperties

    @Autowired
    private lateinit var registrationAttemptLimiter: RegistrationAttemptLimiter

    @Autowired
    private lateinit var accountActivationAttemptRepository: AccountActivationAttemptRepository

    private val registeredEmails = mutableListOf<String>()

    @AfterEach
    fun removeRegisteredUsers() {

        registeredEmails
            .filter { it != User.ADMIN_USERNAME }
            .mapNotNull { email -> userRepository.findByEmail(email) }
            .forEach { user -> userService.deleteAccount(user) }

        registeredEmails.clear()
    }

    @Test
    fun `should register a pending inactive account without roles and send the activation e-mail`() {

        authenticateAnonymously()

        register("new-user@webbudget.com.br").expectStatus().isCreated

        val user = userRepository.findByEmail("new-user@webbudget.com.br")!!

        assertThat(user.status).isEqualTo(UserStatus.PENDING)
        assertThat(user.active).isFalse()
        assertThat(user.grants).isEmpty()
        assertThat(user.authProvider).isEqualTo(AuthProvider.LOCAL)
        assertThat(user.defaultLanguage).isEqualTo(Language.PT_BR)
        assertThat(user.name).isEqualTo("New User")
        assertThat(user.password).isNotEqualTo(PASSWORD).startsWith("$2")

        val message = greenMail.receivedMessages.single()

        assertThat(message.subject).isEqualTo("Ativar conta de usuário")
        assertThat(message.allRecipients.map { it.toString() }).containsExactly("new-user@webbudget.com.br")
        assertThat(accountActivationAttemptRepository.findByUserEmail("new-user@webbudget.com.br")).hasSize(1)
    }

    @Test
    fun `should register in the requested language`() {

        authenticateAnonymously()

        register("english@webbudget.com.br", language = "EN_US").expectStatus().isCreated

        assertThat(userRepository.findByEmail("english@webbudget.com.br")!!.defaultLanguage).isEqualTo(Language.EN_US)
        assertThat(greenMail.receivedMessages.single().subject).isEqualTo("User account activation")
    }

    @Test
    fun `should answer the same way and send nothing when the e-mail is already registered`() {

        authenticateAnonymously()

        register("twice@webbudget.com.br").expectStatus().isCreated
        greenMail.purgeEmailFromAllMailboxes()

        register("twice@webbudget.com.br", name = "Impostor").expectStatus().isCreated

        assertThat(greenMail.receivedMessages).isEmpty()
        assertThat(userRepository.findByEmail("twice@webbudget.com.br")!!.name).isEqualTo("New User")
    }

    @Test
    fun `should not let the e-mail of the main admin be registered again`() {

        authenticateAnonymously()

        register("admin@webbudget.com.br", name = "Impostor").expectStatus().isCreated

        assertThat(userRepository.findByEmail("admin@webbudget.com.br")!!.name).isEqualTo("Administrador")
        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should accept the longest e-mail, name and password that the form allows`() {

        authenticateAnonymously()

        val email = "${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(55)}.com"

        assertThat(email.length).isLessThanOrEqualTo(254).isGreaterThan(150)

        register(email, name = "n".repeat(100), password = "p".repeat(72)).expectStatus().isCreated

        assertThat(userRepository.findByEmail(email)).isNotNull
    }

    @Test
    fun `should answer unprocessable content with the code of every invalid field`() {

        authenticateAnonymously()

        register(
            email = "a".repeat(64) + "@" + ("b".repeat(63) + ".").repeat(3) + "com",
            name = "n".repeat(101),
            password = "p".repeat(73)
        )
            .expectStatus().isEqualTo(422)
            .expectBody()
            .json(
                """
                {
                  "error": "field-validation-failed",
                  "parameters": {
                    "name": "has-max-chars-of-100",
                    "email": "has-max-chars-of-254",
                    "password": "has-max-bytes-of-72"
                  }
                }
                """.trimIndent(),
                JsonCompareMode.LENIENT
            )
    }

    @Test
    fun `should count the password in bytes and not in characters`() {

        authenticateAnonymously()

        register("accents@webbudget.com.br", password = "é".repeat(36)).expectStatus().isCreated

        register("too-many-bytes@webbudget.com.br", password = "é".repeat(37))
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.password").isEqualTo("has-max-bytes-of-72")
    }

    @Test
    fun `should refuse empty fields, control characters and an invalid e-mail`() {

        authenticateAnonymously()

        restTestClient.post()
            .uri(REGISTER_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "", "email": "", "password": ""}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.email").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.password").isEqualTo("is-null-or-blank")

        register("control@webbudget.com.br", name = "Bad\\u0007Name")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("has-control-characters")

        register("not-an-email")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.email").isEqualTo("email-address-is-invalid")
    }

    @Test
    fun `should refuse a register request without the csrf token`() {

        authenticateAnonymously()

        restTestClient.post()
            .uri(REGISTER_URL)
            .header("X-XSRF-TOKEN", "wrong-token")
            .contentType(MediaType.APPLICATION_JSON)
            .body(registerBody("csrf@webbudget.com.br"))
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-csrf-token")
    }

    @Test
    fun `should answer too many requests after the registration limit of an address`() {

        authenticateAnonymously()

        val address = "203.0.113.20"

        repeat(securityProperties.registrationLimit.maxAttempts) { registrationAttemptLimiter.checkAndRecord(address) }

        register("limited@webbudget.com.br", clientIp = address)
            .expectStatus().isEqualTo(429)
            .expectBody()
            .jsonPath("$.error").isEqualTo("too_many_registration_attempts")

        assertThat(userRepository.findByEmail("limited@webbudget.com.br")).isNull()

        register("other-address@webbudget.com.br", clientIp = "203.0.113.21").expectStatus().isCreated
    }

    @Test
    fun `should walk from the registration to a working session after the approval`() {

        authenticateAnonymously()

        register("journey@webbudget.com.br").expectStatus().isCreated

        val activationMail = greenMail.receivedMessages.single()
        assertThat(activationMail.allRecipients.map { it.toString() }).containsExactly("journey@webbudget.com.br")

        assertThat(loginStatus("journey@webbudget.com.br")).isEqualTo(401)

        val token = accountActivationAttemptRepository.findByUserEmail("journey@webbudget.com.br").single().token
        greenMail.purgeEmailFromAllMailboxes()

        activate("journey@webbudget.com.br", token).expectStatus().isOk

        val notices = greenMail.receivedMessages
        assertThat(notices).hasSize(1)
        assertThat(notices.single().allRecipients.map { it.toString() }).containsExactly("admin@webbudget.com.br")
        assertThat(notices.single().subject).isEqualTo("Novo usuário aguardando aprovação")
        assertThat(textOf(notices.single())).contains("journey@webbudget.com.br", "New User")

        val pendingCookie = login("journey@webbudget.com.br", PASSWORD)

        restTestClient.get()
            .uri("/private/v1/auth/session")
            .header("Cookie", pendingCookie)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PENDING")
            .jsonPath("$.roles.length()").isEqualTo(0)

        restTestClient.get()
            .uri("/private/v1/administration/roles")
            .header("Cookie", pendingCookie)
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("pending_approval")

        val user = userRepository.findByEmail("journey@webbudget.com.br")!!
        greenMail.purgeEmailFromAllMailboxes()

        authenticateAs(User.ADMIN_USERNAME, ADMIN_PASSWORD)

        restTestClient.patch()
            .uri("/private/v1/administration/users/${user.externalId}/approve")
            .exchange()
            .expectStatus().isOk

        assertThat(greenMail.receivedMessages.single().subject).isEqualTo("Sua conta foi aprovada")

        restTestClient.put()
            .uri("/private/v1/administration/users/${user.externalId}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"active": true, "name": "New User", "defaultLanguage": "PT_BR", "roles": ["ADMINISTRATION"]}""")
            .exchange()
            .expectStatus().isOk

        restTestClient.get()
            .uri("/private/v1/administration/roles")
            .header("Cookie", login("journey@webbudget.com.br", PASSWORD))
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `should not tell the admin about an account that was created by an admin`() {

        restTestClient.post()
            .uri("/private/v1/administration/users")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "By Admin", "email": "by-admin@webbudget.com.br", "password": "$PASSWORD",
                    "defaultLanguage": "PT_BR", "roles": ["REGISTRATION"], "sendActivationEmail": true}"""
            )
            .exchange()
            .expectStatus().isCreated

        registeredEmails.add("by-admin@webbudget.com.br")

        assertThat(userRepository.findByEmail("by-admin@webbudget.com.br")!!.status).isEqualTo(UserStatus.APPROVED)

        val token = accountActivationAttemptRepository.findByUserEmail("by-admin@webbudget.com.br").single().token
        greenMail.purgeEmailFromAllMailboxes()

        authenticateAnonymously()
        activate("by-admin@webbudget.com.br", token).expectStatus().isOk

        assertThat(greenMail.receivedMessages).isEmpty()
        assertThat(loginStatus("by-admin@webbudget.com.br")).isEqualTo(200)
    }

    private fun register(
        email: String,
        name: String = "New User",
        password: String = PASSWORD,
        language: String? = null,
        clientIp: String = "198.51.100.1"
    ): ResponseSpec {

        registeredEmails.add(email)

        return restTestClient.post()
            .uri(REGISTER_URL)
            .header("X-Forwarded-For", clientIp)
            .contentType(MediaType.APPLICATION_JSON)
            .body(registerBody(email, name, password, language))
            .exchange()
    }

    private fun registerBody(
        email: String,
        name: String = "New User",
        password: String = PASSWORD,
        language: String? = null
    ): String {

        val languageField = language?.let { """, "defaultLanguage": "$it"""" }.orEmpty()

        return """{"name": "$name", "email": "$email", "password": "$password"$languageField}"""
    }

    private fun activate(email: String, token: UUID): ResponseSpec = restTestClient.patch()
        .uri("/private/v1/accounts/activate")
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"email": "$email", "token": "$token"}""")
        .exchange()

    private fun loginStatus(email: String): Int = runCatching { login(email, PASSWORD) }
        .map { 200 }
        .getOrElse { 401 }

    private fun textOf(message: MimeMessage): String = message.content.let { content ->
        val multipart = content as jakarta.mail.Multipart
        (0 until multipart.count).joinToString("") { index -> extractText(multipart.getBodyPart(index)) }
    }

    private fun extractText(part: jakarta.mail.BodyPart): String = when (val content = part.content) {
        is String -> content
        is jakarta.mail.Multipart -> (0 until content.count).joinToString("") { extractText(content.getBodyPart(it)) }
        else -> ""
    }

    companion object {
        private const val REGISTER_URL = "/private/v1/auth/register"
        private const val PASSWORD = "journey-password"
    }
}
