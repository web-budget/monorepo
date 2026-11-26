package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.infrastructure.repository.registration.CostCenterRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-cost-centers.sql")
class CostCenterControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var costCenterRepository: CostCenterRepository

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
    fun `should list the cost centers paged and sorted`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?page=0&size=2&sort=fullName,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.content[0].fullName").isEqualTo("Outros")
            .jsonPath("$.content[1].fullName").isEqualTo("Carro > Impostos")
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.page.totalPages").isEqualTo(2)
    }

    @Test
    fun `should filter by name, full name and description ignoring case`() {

        listOf("outros" to 1, "carro >" to 1, "carro" to 2, "do carro" to 1, "geral" to 1).forEach { (filter, total) ->
            restTestClient.get()
                .uri("$ENDPOINT_URL?filter={filter}", filter)
                .exchange()
                .expectStatus().isOk
                .expectBody()
                .jsonPath("$.page.totalElements").isEqualTo(total)
        }
    }

    @Test
    fun `should filter by the status`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=INACTIVE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("Impostos")

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=ACTIVE&filter=carro")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
    }

    @Test
    fun `should find a root cost center`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$OTHERS_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(OTHERS_ID)
            .jsonPath("$.name").isEqualTo("Outros")
            .jsonPath("$.description").isEqualTo("Centro de custo geral")
            .jsonPath("$.expenseBudgetPercentage").isEqualTo(10)
            .jsonPath("$.parentCostCenter").doesNotExist()
    }

    @Test
    fun `should find a child with its parent`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$TAXES_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Impostos")
            .jsonPath("$.parentCostCenter.id").isEqualTo(CAR_ID)
            .jsonPath("$.parentCostCenter.name").isEqualTo("Carro")
            .jsonPath("$.parentCostCenter.fullName").isEqualTo("Carro")
    }

    @Test
    fun `should answer not found when the cost center does not exist`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should create a root cost center`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "House", "description": "Home", "expenseBudgetPercentage": 6.5}""")
            .exchange()
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location)
                    .matches("http://localhost:[0-9]+/private/v1/registration/cost-centers/[0-9a-f-]{36}")
            }

        val created = costCenterRepository.findAll("House", null, PageRequest.of(0, 1)).content.single()

        assertThat(created.fullName).isEqualTo("House")
        assertThat(created.active).isTrue()
        assertThat(created.lastUpdate).isNotNull
        assertThat(created.version).isEqualTo(0.toShort())
    }

    @Test
    fun `should create a child with the full name built from its parent`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Insurance", "parentCostCenter": "$TAXES_ID"}""")
            .exchange()
            .expectStatus().isCreated

        val created = costCenterRepository.findAll("Insurance", null, PageRequest.of(0, 1)).content.single()

        assertThat(created.fullName).isEqualTo("Carro > Impostos > Insurance")
    }

    @Test
    fun `should answer unprocessable content when the required fields are missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": ""}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
    }

    @Test
    fun `should save the expense budget percentage of a root and of a child`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "House", "expenseBudgetPercentage": 100}""")
            .exchange()
            .expectStatus().isCreated

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Rent", "expenseBudgetPercentage": 0.01, "parentCostCenter": "$OTHERS_ID"}""")
            .exchange()
            .expectStatus().isCreated

        val house = costCenterRepository.findAll("House", null, PageRequest.of(0, 1)).content.single()
        val rent = costCenterRepository.findAll("Rent", null, PageRequest.of(0, 1)).content.single()

        assertThat(house.expenseBudgetPercentage).isEqualByComparingTo("100")
        assertThat(rent.expenseBudgetPercentage).isEqualByComparingTo("0.01")
    }

    @Test
    fun `should create a cost center without the expense budget percentage`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "House"}""")
            .exchange()
            .expectStatus().isCreated

        val created = costCenterRepository.findAll("House", null, PageRequest.of(0, 1)).content.single()

        assertThat(created.expenseBudgetPercentage).isNull()
    }

    @Test
    fun `should refuse an expense budget percentage out of the range or with more than two decimals`() {

        mapOf(
            "0" to "is-not-positive",
            "-5" to "is-not-positive",
            "100.01" to "is-above-max-of-100",
            "101" to "is-above-max-of-100",
            "12.345" to "has-max-decimals-of-2"
        ).forEach { (percentage, code) ->
            restTestClient.post()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"name": "House", "expenseBudgetPercentage": $percentage}""")
                .exchange()
                .expectStatus().isEqualTo(422)
                .expectBody()
                .jsonPath("$.parameters.expenseBudgetPercentage").isEqualTo(code)

            restTestClient.put()
                .uri("$ENDPOINT_URL/$OTHERS_ID")
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"name": "Outros", "active": true, "expenseBudgetPercentage": $percentage}""")
                .exchange()
                .expectStatus().isEqualTo(422)
                .expectBody()
                .jsonPath("$.parameters.expenseBudgetPercentage").isEqualTo(code)
        }

        assertThat(costCenterRepository.existsByName("House")).isFalse()
    }

    @Test
    fun `should clear the expense budget percentage when the update does not send it`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$OTHERS_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Outros", "active": true}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.expenseBudgetPercentage").doesNotExist()
    }

    @Test
    fun `should return the percentage in the list and not the old budgets`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=expenseBudgetPercentage,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].fullName").isEqualTo("Carro")
            .jsonPath("$.content[0].expenseBudgetPercentage").isEqualTo(50)
            .jsonPath("$.content[0].incomeBudget").doesNotExist()
            .jsonPath("$.content[0].expenseBudget").doesNotExist()

        restTestClient.get()
            .uri("$ENDPOINT_URL/$OTHERS_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.incomeBudget").doesNotExist()
            .jsonPath("$.expenseBudget").doesNotExist()
    }

    @Test
    fun `should answer conflict when a root name is already used by any cost center`() {

        listOf("outros", "Impostos").forEach { name ->
            restTestClient.post()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"name": "$name"}""")
                .exchange()
                .expectStatus().isEqualTo(409)
                .expectBody()
                .jsonPath("$.parameters['cost-center.name']").isEqualTo(name)
        }
    }

    @Test
    fun `should answer conflict when the full name of a child is already used`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "impostos", "parentCostCenter": "$CAR_ID"}""")
            .exchange()
            .expectStatus().isEqualTo(409)
    }

    @Test
    fun `should accept the same child name under another parent`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Impostos", "parentCostCenter": "$OTHERS_ID"}""")
            .exchange()
            .expectStatus().isCreated
    }

    @Test
    fun `should answer not found when the parent does not exist`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Orphan", "parentCostCenter": "${UUID.randomUUID()}"}""")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should update the cost center`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$OTHERS_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Outros", "active": false, "description": "Changed", "expenseBudgetPercentage": 2.25}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.active").isEqualTo(false)
            .jsonPath("$.description").isEqualTo("Changed")
            .jsonPath("$.expenseBudgetPercentage").isEqualTo(2.25)

        val updated = costCenterRepository.findByExternalId(UUID.fromString(OTHERS_ID))!!

        assertThat(updated.version).isEqualTo(1.toShort())
    }

    @Test
    fun `should rename the children and grandchildren when the parent is renamed`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Insurance", "parentCostCenter": "$TAXES_ID"}""")
            .exchange()
            .expectStatus().isCreated

        restTestClient.put()
            .uri("$ENDPOINT_URL/$CAR_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Vehicle", "active": true}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Vehicle")

        assertThat(costCenterRepository.findByExternalId(UUID.fromString(TAXES_ID))!!.fullName)
            .isEqualTo("Vehicle > Impostos")
        assertThat(costCenterRepository.findAll("Insurance", null, PageRequest.of(0, 1)).content.single().fullName)
            .isEqualTo("Vehicle > Impostos > Insurance")
    }

    @Test
    fun `should move a cost center to another parent and to the root`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$TAXES_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Impostos", "active": true, "parentCostCenter": "$OTHERS_ID"}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.parentCostCenter.fullName").isEqualTo("Outros")

        assertThat(costCenterRepository.findByExternalId(UUID.fromString(TAXES_ID))!!.fullName)
            .isEqualTo("Outros > Impostos")

        restTestClient.put()
            .uri("$ENDPOINT_URL/$TAXES_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Taxes", "active": true}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.parentCostCenter").doesNotExist()

        assertThat(costCenterRepository.findByExternalId(UUID.fromString(TAXES_ID))!!.fullName).isEqualTo("Taxes")
    }

    @Test
    fun `should refuse a parent that is the cost center itself or one of its descendants`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$CAR_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Carro", "active": true, "parentCostCenter": "$CAR_ID"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-parent-cost-center")

        restTestClient.put()
            .uri("$ENDPOINT_URL/$CAR_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Carro", "active": true, "parentCostCenter": "$TAXES_ID"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-parent-cost-center")
    }

    @Test
    fun `should answer conflict when updating to the name of another cost center`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$CAR_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "OUTROS", "active": true}""")
            .exchange()
            .expectStatus().isEqualTo(409)

        restTestClient.put()
            .uri("$ENDPOINT_URL/$TAXES_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Impostos", "active": true, "parentCostCenter": "$CAR_ID"}""")
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `should answer not found when updating an unknown cost center`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Name", "active": true}""")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should delete the cost center`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$TAXES_ID")
            .exchange()
            .expectStatus().isOk

        assertThat(costCenterRepository.findByExternalId(UUID.fromString(TAXES_ID))).isNull()
    }

    @Test
    fun `should refuse to delete a cost center that has children`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$CAR_ID")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("data-integrity-violation")
    }

    @Test
    fun `should answer not found when deleting an unknown cost center`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/registration/cost-centers"
        private const val OTHERS_ID = "52e3456b-1b0d-42c5-8be0-07ddaecce441"
        private const val CAR_ID = "3cb5732d-2551-4eb9-8b41-f5d312ba7aac"
        private const val TAXES_ID = "99a9e2df-0980-4724-b9a4-bba7d8c12120"
    }
}
