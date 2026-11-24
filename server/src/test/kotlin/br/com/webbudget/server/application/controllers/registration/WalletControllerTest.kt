package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.infrastructure.repository.registration.WalletRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-wallets.sql")
class WalletControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var walletRepository: WalletRepository

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
    fun `should list the wallets paged and sorted`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?page=0&size=2&sort=name,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.content[0].name").isEqualTo("Personal")
            .jsonPath("$.content[1].name").isEqualTo("Old wallet")
            .jsonPath("$.content[0].type").isEqualTo("PERSONAL")
            .jsonPath("$.page.size").isEqualTo(2)
            .jsonPath("$.page.number").isEqualTo(0)
            .jsonPath("$.page.totalElements").isEqualTo(4)
            .jsonPath("$.page.totalPages").isEqualTo(2)
    }

    @Test
    fun `should list the wallets from the newest to the oldest when no sort is requested`() {

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Old wallet")
            .jsonPath("$.content[3].name").isEqualTo("Personal")
    }

    @Test
    fun `should ignore unknown sort properties`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=unknown,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(4)
    }

    @Test
    fun `should filter by the status`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=INACTIVE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("Old wallet")
            .jsonPath("$.content[0].active").isEqualTo(false)

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=ACTIVE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=ALL")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(4)
    }

    @Test
    fun `should filter by name and bank ignoring case and not by the description`() {

        assertThat(namesFilteredBy("PERSONAL")).containsExactlyInAnyOrder("Personal")
        assertThat(namesFilteredBy("brok")).containsExactlyInAnyOrder("Investments")
        assertThat(namesFilteredBy("wallet")).containsExactlyInAnyOrder("Old wallet")
        assertThat(namesFilteredBy("not used")).isEmpty()
    }

    @Test
    fun `should filter by part of the agency and number`() {

        assertThat(namesFilteredBy("321")).containsExactly("Investments")
        assertThat(namesFilteredBy("456789")).containsExactly("Bank account")
        assertThat(namesFilteredBy("4567")).containsExactly("Bank account")
        assertThat(namesFilteredBy("32")).containsExactly("Investments")
        assertThat(namesFilteredBy("99999")).isEmpty()
    }

    @Test
    fun `should list the balance, agency and number of each wallet`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=currentBalance,desc&size=1")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Bank account")
            .jsonPath("$.content[0].currentBalance").isEqualTo(150.5)
            .jsonPath("$.content[0].agency").isEqualTo("123")
            .jsonPath("$.content[0].number").isEqualTo("456789")
            .jsonPath("$.content[0].bank").isEqualTo("Bank")
    }

    @Test
    fun `should sort the wallets by type and balance`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=type,asc&sort=name,asc&size=1")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Bank account")
    }

    @Test
    fun `should not tell the last entry of a wallet without entries`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$PERSONAL_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.lastEntryOn").doesNotExist()
    }

    @Test
    fun `should combine the text filter with the status`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?filter=wallet&status=INACTIVE")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("Old wallet")
    }

    @Test
    fun `should find by id`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$BANK_ACCOUNT_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(BANK_ACCOUNT_ID)
            .jsonPath("$.name").isEqualTo("Bank account")
            .jsonPath("$.type").isEqualTo("BANK_ACCOUNT")
            .jsonPath("$.currentBalance").isEqualTo(150.50)
            .jsonPath("$.active").isEqualTo(true)
            .jsonPath("$.description").isEqualTo("Bank account wallet")
            .jsonPath("$.bank").isEqualTo("Bank")
            .jsonPath("$.agency").isEqualTo("123")
            .jsonPath("$.number").isEqualTo("456789")
    }

    @Test
    fun `should answer not found when the wallet does not exist`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.error").isEqualTo("resource-not-found")
    }

    @Test
    fun `should create the wallet and answer created with the location`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Savings", "type": "BANK_ACCOUNT", "bank": "Other", "agency": "1", "number": "2"}""")
            .exchange()
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location)
                    .matches("http://localhost:[0-9]+/private/v1/registration/wallets/[0-9a-f-]{36}")
            }

        val created = walletRepository.findAll("Savings", null, PageRequest.of(0, 10))

        assertThat(created.content).hasSize(1)
        assertThat(created.content.first().active).isTrue()
        assertThat(created.content.first().currentBalance).isEqualByComparingTo("0")
        assertThat(created.content.first().version).isEqualTo(0.toShort())
    }

    @Test
    fun `should answer unprocessable content when the required fields are missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "", "type": null}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.error").isEqualTo("field-validation-failed")
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.type").isEqualTo("is-null")
    }

    @Test
    fun `should answer conflict when the name is already taken ignoring case`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "PERSONAL", "type": "PERSONAL"}""")
            .exchange()
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("conflicting-properties")
            .jsonPath("$.parameters['wallet.name']").isEqualTo("PERSONAL")
    }

    @Test
    fun `should answer conflict when the bank information is already taken`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Another", "type": "BANK_ACCOUNT", "bank": "Bank", "agency": "123", "number": "456789"}""")
            .exchange()
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.parameters['wallet.bank']").isEqualTo("Bank")
            .jsonPath("$.parameters['wallet.agency']").isEqualTo("123")
            .jsonPath("$.parameters['wallet.number']").isEqualTo("456789")
    }

    @Test
    fun `should accept the same bank and agency when the number is missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Another", "type": "BANK_ACCOUNT", "bank": "Bank", "agency": "123"}""")
            .exchange()
            .expectStatus().isCreated
    }

    @Test
    fun `should update the wallet`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$BANK_ACCOUNT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "Renamed", "active": false, "description": "Changed", "bank": "Bank", "agency": "123", "number": "456789"}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(BANK_ACCOUNT_ID)
            .jsonPath("$.name").isEqualTo("Renamed")
            .jsonPath("$.active").isEqualTo(false)
            .jsonPath("$.description").isEqualTo("Changed")
            .jsonPath("$.currentBalance").isEqualTo(150.50)

        val updated = walletRepository.findByExternalId(UUID.fromString(BANK_ACCOUNT_ID))!!

        assertThat(updated.name).isEqualTo("Renamed")
        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.lastUpdate).isNotNull
        assertThat(updated.currentBalance).isEqualByComparingTo("150.50")
    }

    @Test
    fun `should keep the own name and bank information on update`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$BANK_ACCOUNT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Bank account", "active": true, "bank": "Bank", "agency": "123", "number": "456789"}""")
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `should answer conflict when updating to the name of another wallet`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$BANK_ACCOUNT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "personal", "active": true}""")
            .exchange()
            .expectStatus().isEqualTo(409)
    }

    @Test
    fun `should answer conflict when updating to the bank information of another wallet`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$BANK_ACCOUNT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Bank account", "active": true, "bank": "Broker", "agency": "321", "number": "987654"}""")
            .exchange()
            .expectStatus().isEqualTo(409)
    }

    @Test
    fun `should answer unprocessable content when the update exceeds the sizes`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$BANK_ACCOUNT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Bank account", "active": null, "agency": "12345678901"}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.active").isEqualTo("is-null")
            .jsonPath("$.parameters.agency").isEqualTo("has-max-chars-of-10")
    }

    @Test
    fun `should answer not found when updating an unknown wallet`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Name", "active": true}""")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should delete the wallet`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$PERSONAL_ID")
            .exchange()
            .expectStatus().isOk

        assertThat(walletRepository.findByExternalId(UUID.fromString(PERSONAL_ID))).isNull()
    }

    @Test
    fun `should answer not found when deleting an unknown wallet`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should only know the banking information when the three fields are filled`() {

        assertThat(Wallet("Wallet", Wallet.Type.PERSONAL).hasValidBankInformation()).isFalse()
        assertThat(Wallet("Wallet", Wallet.Type.PERSONAL, bank = "Bank", agency = " ", number = "1").hasValidBankInformation())
            .isFalse()
        assertThat(Wallet("Wallet", Wallet.Type.PERSONAL, bank = "Bank", agency = "1", number = "1").hasValidBankInformation())
            .isTrue()
    }

    private fun namesFilteredBy(filter: String): List<String> {

        val body = restTestClient.get()
            .uri("$ENDPOINT_URL?filter={filter}&sort=name,asc", filter)
            .exchange()
            .expectStatus().isOk
            .returnResult(String::class.java)
            .responseBody!!

        return Regex("\"name\":\"([^\"]+)\"").findAll(body).map { it.groupValues[1] }.toList()
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/registration/wallets"
        private const val PERSONAL_ID = "d6421251-7b38-4765-88e0-4d70bc3bc4c7"
        private const val BANK_ACCOUNT_ID = "cd00845c-ae27-47e4-8282-c8df1c42acfe"
    }
}
