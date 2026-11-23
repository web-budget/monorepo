package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.json.JsonCompareMode
import java.util.UUID

@Sql("/sql/administration/clear-tables.sql", "/sql/administration/create-user.sql")
class UserControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `should require authentication`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should require the administration role`() {

        authenticateWithRoles("FINANCIAL")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should create the account and return created with the location`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(CREATE_PAYLOAD)
            .exchange()
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location).matches("http://localhost:[0-9]+/private/v1/administration/users/[0-9a-f-]{36}")
            }

        val created = userRepository.findByEmail("created@webbudget.com.br")!!

        assertThat(created.name).isEqualTo("Created")
        assertThat(created.active).isFalse()
        assertThat(created.password).isNotEqualTo("s3cr3t")
        assertThat(created.grants.map { it.role.name }).containsExactly("REGISTRATION")
    }

    @Test
    fun `should send the activation e-mail when requested on creation`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(CREATE_PAYLOAD.replace("\"roles\"", "\"sendActivationEmail\": true, \"roles\""))
            .exchange()
            .expectStatus().isCreated

        assertThat(greenMail.receivedMessages).hasSize(1)
        assertThat(greenMail.receivedMessages.first().subject).isEqualTo("Ative sua conta no webBudget")
    }

    @Test
    fun `should answer unprocessable content when required fields are missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "", "email": "", "password": "", "roles": [], "defaultLanguage": null}"""
            )
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .json(
                """
                {
                  "error": "field-validation-failed",
                  "parameters": {
                    "name": "is-null-or-blank",
                    "email": "is-null-or-blank",
                    "password": "is-null-or-blank",
                    "roles": "is-empty",
                    "defaultLanguage": "is-null"
                  }
                }
                """.trimIndent(),
                JsonCompareMode.LENIENT
            )
    }

    @Test
    fun `should answer conflict when the e-mail is already taken`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(CREATE_PAYLOAD.replace("created@webbudget.com.br", "user@webbudget.com.br"))
            .exchange()
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("conflicting-properties")
            .jsonPath("$.parameters['user.email']").isEqualTo("user@webbudget.com.br")
    }

    @Test
    fun `should update the account and replace its roles`() {

        val user = userRepository.findByEmail("user@webbudget.com.br")!!

        restTestClient.put()
            .uri("$ENDPOINT_URL/${user.externalId}")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"active": false, "name": "Updated User", "defaultLanguage": "EN_US", "roles": ["FINANCIAL"]}"""
            )
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(user.externalId.toString())
            .jsonPath("$.name").isEqualTo("Updated User")
            .jsonPath("$.email").isEqualTo("user@webbudget.com.br")
            .jsonPath("$.active").isEqualTo(false)
            .jsonPath("$.defaultLanguage").isEqualTo("EN_US")
            .jsonPath("$.authorities[0]").isEqualTo("FINANCIAL")
            .jsonPath("$.authorities.length()").isEqualTo(1)

        val updated = userRepository.findByExternalId(user.externalId!!)!!

        assertThat(updated.version).isGreaterThan(user.version)
        assertThat(updated.lastUpdate).isNotNull
    }

    @Test
    fun `should answer not found when updating an unknown account`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"active": true, "name": "Name", "defaultLanguage": "PT_BR", "roles": ["FINANCIAL"]}""")
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.error").isEqualTo("resource-not-found")
    }

    @Test
    fun `should update the password only`() {

        val user = userRepository.findByEmail("user@webbudget.com.br")!!

        restTestClient.patch()
            .uri("$ENDPOINT_URL/${user.externalId}/update-password")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"password": "new-secret", "temporary": true}""")
            .exchange()
            .expectStatus().isOk

        val updated = userRepository.findByExternalId(user.externalId!!)!!

        assertThat(updated.password).isNotEqualTo(user.password)
        assertThat(updated.name).isEqualTo(user.name)
    }

    @Test
    fun `should answer not found when updating the password of an unknown account`() {

        restTestClient.patch()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}/update-password")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"password": "new-secret", "temporary": true}""")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should find by id`() {

        val user = userRepository.findByEmail("user@webbudget.com.br")!!

        restTestClient.get()
            .uri("$ENDPOINT_URL/${user.externalId}")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .json(
                """
                {
                  "id": "${user.externalId}",
                  "name": "User",
                  "email": "user@webbudget.com.br",
                  "active": true,
                  "defaultLanguage": "PT_BR",
                  "authorities": ["DASHBOARDS"],
                  "status": "APPROVED",
                  "totpEnabled": false,
                  "dueDateNotices": true
                }
                """.trimIndent(),
                JsonCompareMode.STRICT
            )
    }

    @Test
    fun `should answer not found when the account does not exist`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should delete the account`() {

        val user = userRepository.findByEmail("other-user@webbudget.com.br")!!

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${user.externalId}")
            .exchange()
            .expectStatus().isOk

        assertThat(userRepository.findByExternalId(user.externalId!!)).isNull()
    }

    @Test
    fun `should answer not found when deleting an unknown account`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should answer bad request when deleting the main admin`() {

        val admin = userRepository.findByEmail("admin@webbudget.com.br")!!

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${admin.externalId}")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("bad-request")
    }

    @Test
    fun `should page the accounts`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?page=0&size=2&sort=name,asc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.content[0].name").isEqualTo("Administrador")
            .jsonPath("$.content[1].name").isEqualTo("Other User")
            .jsonPath("$.page.size").isEqualTo(2)
            .jsonPath("$.page.number").isEqualTo(0)
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.page.totalPages").isEqualTo(2)
    }

    @Test
    fun `should sort descending and ignore unknown sort properties`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=email,desc&sort=unknown,asc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].email").isEqualTo("user@webbudget.com.br")
            .jsonPath("$.content[2].email").isEqualTo("admin@webbudget.com.br")
    }

    @Test
    fun `should filter by text and status`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?filter=OTHER&status=INACTIVE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.content[0].email").isEqualTo("other-user@webbudget.com.br")
            .jsonPath("$.content[0].authorities[0]").isEqualTo("OTHER")

        restTestClient.get()
            .uri("$ENDPOINT_URL?filter=other&status=ACTIVE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(0)

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=ALL&filter=webbudget.com.br")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/administration/users"

        private const val CREATE_PAYLOAD = """{
            "name": "Created",
            "email": "created@webbudget.com.br",
            "password": "s3cr3t",
            "defaultLanguage": "PT_BR",
            "roles": ["REGISTRATION"]
        }"""
    }
}
