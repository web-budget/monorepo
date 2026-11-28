package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.mail.MailPasswordCipher
import br.com.webbudget.server.jooq.administration.tables.references.MAIL_SETTINGS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.web.servlet.client.RestTestClient

@Sql("/sql/administration/clear-tables.sql")
@Sql("/sql/administration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class MailSettingsControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var mailPasswordCipher: MailPasswordCipher

    @Test
    fun `should require authentication`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should require the administration role to read, to write and to enable`() {

        authenticateWithRoles("REGISTRATION", "FINANCIAL", "DASHBOARDS")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.error").isEqualTo("forbidden")

        put(validBody())
            .expectStatus().isForbidden

        patchEnabled(true)
            .expectStatus().isForbidden
    }

    @Test
    fun `should answer the initial state`() {

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.enabled").isEqualTo(false)
            .jsonPath("$.configured").isEqualTo(false)
            .jsonPath("$.passwordSet").isEqualTo(false)
            .jsonPath("$.passwordStorageAvailable").isEqualTo(true)
            .jsonPath("$.security").isEqualTo("STARTTLS")
            .jsonPath("$.host").doesNotExist()
            .jsonPath("$.port").doesNotExist()
            .jsonPath("$.password").doesNotExist()
    }

    @Test
    fun `should save the server and read it back without the password`() {

        val body = put(validBody(password = PLAIN_PASSWORD))
            .expectStatus().isOk
            .expectBody(String::class.java)
            .returnResult()
            .responseBody!!

        assertThat(body).doesNotContain(PLAIN_PASSWORD)

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.enabled").isEqualTo(false)
            .jsonPath("$.configured").isEqualTo(true)
            .jsonPath("$.host").isEqualTo("smtp.example.com")
            .jsonPath("$.port").isEqualTo(587)
            .jsonPath("$.security").isEqualTo("STARTTLS")
            .jsonPath("$.username").isEqualTo("mailer")
            .jsonPath("$.passwordSet").isEqualTo(true)
            .jsonPath("$.fromAddress").isEqualTo("no-reply@example.com")
            .jsonPath("$.fromName").isEqualTo("Budget")
            .jsonPath("$.replyToAddress").isEqualTo("help@example.com")
            .jsonPath("$.lastUpdate").exists()
            .jsonPath("$.password").doesNotExist()
            .jsonPath("$.passwordCiphertext").doesNotExist()
    }

    @Test
    fun `should store the password encrypted`() {

        put(validBody(password = PLAIN_PASSWORD)).expectStatus().isOk

        val ciphertext = storedCiphertext()!!

        assertThat(ciphertext).isNotEqualTo(PLAIN_PASSWORD).doesNotContain(PLAIN_PASSWORD)
        assertThat(mailPasswordCipher.decrypt(ciphertext)).isEqualTo(PLAIN_PASSWORD)
    }

    @Test
    fun `should keep the stored password when the new one is empty or missing`() {

        put(validBody(password = PLAIN_PASSWORD)).expectStatus().isOk
        val ciphertext = storedCiphertext()

        put(validBody(password = "")).expectStatus().isOk
        put(validBody(host = "other.example.com")).expectStatus().isOk

        assertThat(storedCiphertext()).isEqualTo(ciphertext)

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectBody()
            .jsonPath("$.host").isEqualTo("other.example.com")
            .jsonPath("$.passwordSet").isEqualTo(true)
    }

    @Test
    fun `should replace the stored password when a new one comes`() {

        put(validBody(password = PLAIN_PASSWORD)).expectStatus().isOk
        val ciphertext = storedCiphertext()

        put(validBody(password = "another-secret")).expectStatus().isOk

        assertThat(storedCiphertext()).isNotEqualTo(ciphertext)
        assertThat(mailPasswordCipher.decrypt(storedCiphertext()!!)).isEqualTo("another-secret")
    }

    @Test
    fun `should erase the password when the username is removed`() {

        put(validBody(password = PLAIN_PASSWORD)).expectStatus().isOk
        assertThat(storedCiphertext()).isNotNull()

        put(validBody(username = null, password = PLAIN_PASSWORD))
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.username").doesNotExist()
            .jsonPath("$.passwordSet").isEqualTo(false)

        assertThat(storedCiphertext()).isNull()
    }

    @Test
    fun `should refuse to enable the sending without a saved server`() {

        patchEnabled(true)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("mail-not-configured")
    }

    @Test
    fun `should enable and disable the sending after the server is saved`() {

        put(validBody()).expectStatus().isOk

        patchEnabled(true)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.enabled").isEqualTo(true)

        put(validBody(host = "other.example.com"))
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.enabled").isEqualTo(true)

        patchEnabled(false)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.enabled").isEqualTo(false)
    }

    @Test
    fun `should always allow to disable the sending`() {

        patchEnabled(false)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.enabled").isEqualTo(false)
    }

    @Test
    fun `should answer the validation codes of the required fields`() {

        put("{}")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.host").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.port").isEqualTo("is-null")
            .jsonPath("$.parameters.security").isEqualTo("is-null")
            .jsonPath("$.parameters.fromAddress").isEqualTo("is-null-or-blank")

        patchEnabledBody("{}")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.enabled").isEqualTo("is-null")
    }

    @Test
    fun `should answer the validation codes of the field limits and formats`() {

        for (port in listOf(0, 65536)) {
            put(validBody(port = port))
                .expectStatus().isEqualTo(422)
                .expectBody()
                .jsonPath("$.parameters.port").isEqualTo("is-out-of-range")
        }

        put(validBody(host = "h".repeat(256), username = "u".repeat(256), fromName = "n".repeat(91)))
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.host").isEqualTo("has-max-chars-of-255")
            .jsonPath("$.parameters.username").isEqualTo("has-max-chars-of-255")
            .jsonPath("$.parameters.fromName").isEqualTo("has-max-chars-of-90")

        put(validBody(fromAddress = "not-an-email", replyToAddress = "also-not"))
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.fromAddress").isEqualTo("email-address-is-invalid")
            .jsonPath("$.parameters.replyToAddress").isEqualTo("email-address-is-invalid")

        put(validBody(security = "UNKNOWN"))
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.security").isEqualTo("is-null")
    }

    private fun put(body: String): RestTestClient.ResponseSpec = restTestClient.put()
        .uri(ENDPOINT_URL)
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun patchEnabled(enabled: Boolean): RestTestClient.ResponseSpec = patchEnabledBody("""{"enabled": $enabled}""")

    private fun patchEnabledBody(body: String): RestTestClient.ResponseSpec = restTestClient.patch()
        .uri("$ENDPOINT_URL/enabled")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun storedCiphertext(): String? = dsl.select(MAIL_SETTINGS.PASSWORD_CIPHERTEXT)
        .from(MAIL_SETTINGS)
        .where(MAIL_SETTINGS.ID.eq(1))
        .fetchSingle()
        .value1()

    private fun validBody(
        host: String = "smtp.example.com",
        port: Int = 587,
        security: String = "STARTTLS",
        username: String? = "mailer",
        password: String? = null,
        fromAddress: String = "no-reply@example.com",
        fromName: String = "Budget",
        replyToAddress: String = "help@example.com"
    ): String {

        val fields = listOfNotNull(
            """"host": "$host"""",
            """"port": $port""",
            """"security": "$security"""",
            username?.let { """"username": "$it"""" },
            password?.let { """"password": "$it"""" },
            """"fromAddress": "$fromAddress"""",
            """"fromName": "$fromName"""",
            """"replyToAddress": "$replyToAddress""""
        )

        return fields.joinToString(prefix = "{", postfix = "}")
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/administration/mail-settings"
        private const val PLAIN_PASSWORD = "s3cr3t-smtp-password"
    }
}
