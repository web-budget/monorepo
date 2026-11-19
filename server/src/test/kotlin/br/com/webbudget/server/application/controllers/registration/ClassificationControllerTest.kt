package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.infrastructure.repository.registration.ClassificationRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-classifications.sql")
class ClassificationControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var classificationRepository: ClassificationRepository

    @Test
    fun `should require authentication`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should require the registration role`() {

        authenticateWithRoles("FINANCIAL")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should list the classifications paged and sorted`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?page=1&size=3&sort=budget,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("Conta de Luz")
            .jsonPath("$.page.number").isEqualTo(1)
            .jsonPath("$.page.totalElements").isEqualTo(4)
            .jsonPath("$.page.totalPages").isEqualTo(2)
    }

    @Test
    fun `should filter by name and description ignoring case`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?filter=MERCADO")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("Mercado")

        restTestClient.get()
            .uri("$ENDPOINT_URL?filter=casa")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("Conta de Luz")
    }

    @Test
    fun `should treat the wildcards of the filter as plain text`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?filter=%25")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(0)
    }

    @Test
    fun `should filter by the status`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=INACTIVE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("Manutencao")

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=ACTIVE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)
    }

    @Test
    fun `should find by id`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$SALES_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(SALES_ID)
            .jsonPath("$.name").isEqualTo("Vendas")
            .jsonPath("$.type").isEqualTo("INCOME")
            .jsonPath("$.budget").isEqualTo(3500.00)
            .jsonPath("$.description").isEqualTo("Receita com vendas")
            .jsonPath("$.active").isEqualTo(true)
    }

    @Test
    fun `should answer not found when the classification does not exist`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should create the classification and answer created with the location`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Salary", "type": "INCOME", "budget": 100.5, "description": "Monthly"}""")
            .exchange()
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location)
                    .matches("http://localhost:[0-9]+/private/v1/registration/classifications/[0-9a-f-]{36}")
            }

        val created = classificationRepository.findAll("Salary", null, PageRequest.of(0, 1)).content.single()

        assertThat(created.active).isTrue()
        assertThat(created.budget).isEqualByComparingTo("100.5")
        assertThat(created.version).isEqualTo(0.toShort())
    }

    @Test
    fun `should answer unprocessable content when the required fields are missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": " ", "type": null}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.type").isEqualTo("is-null")
    }

    @Test
    fun `should answer conflict when the name is already taken ignoring case`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "mercado", "type": "EXPENSE"}""")
            .exchange()
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.parameters['classification.name']").isEqualTo("mercado")
    }

    @Test
    fun `should update the classification without changing its type`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$SALES_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Vendas", "budget": 10, "description": "Changed", "active": false}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.type").isEqualTo("INCOME")
            .jsonPath("$.budget").isEqualTo(10)
            .jsonPath("$.description").isEqualTo("Changed")
            .jsonPath("$.active").isEqualTo(false)

        val updated = classificationRepository.findByExternalId(UUID.fromString(SALES_ID))!!

        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.lastUpdate).isNotNull
    }

    @Test
    fun `should answer conflict when updating to the name of another classification`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$SALES_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "MERCADO", "active": true}""")
            .exchange()
            .expectStatus().isEqualTo(409)
    }

    @Test
    fun `should answer not found when updating an unknown classification`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Name", "active": true}""")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should delete the classification`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$SALES_ID")
            .exchange()
            .expectStatus().isOk

        assertThat(classificationRepository.findByExternalId(UUID.fromString(SALES_ID))).isNull()
    }

    @Test
    fun `should answer not found when deleting an unknown classification`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/registration/classifications"
        private const val SALES_ID = "98cb4961-5cde-46fb-abfd-8461be7d628b"
    }
}
