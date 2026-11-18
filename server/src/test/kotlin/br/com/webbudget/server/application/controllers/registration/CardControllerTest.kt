package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.infrastructure.repository.registration.CardRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-wallets.sql", "/sql/registration/create-cards.sql")
class CardControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var cardRepository: CardRepository

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
    fun `should list the cards paged and sorted`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?page=0&size=1&sort=lastFourDigits,asc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("XP Infinite")
            .jsonPath("$.content[0].type").isEqualTo("CREDIT")
            .jsonPath("$.content[0].flag").isEqualTo("Visa Infinite")
            .jsonPath("$.page.totalElements").isEqualTo(2)
            .jsonPath("$.page.totalPages").isEqualTo(2)
    }

    @Test
    fun `should filter by name, last four digits and flag ignoring case`() {

        listOf("ITAU" to "Itau Personalite", "5431" to "Itau Personalite", "visa" to "XP Infinite").forEach { (filter, name) ->
            restTestClient.get()
                .uri("$ENDPOINT_URL?filter={filter}", filter)
                .exchange()
                .expectStatus().isOk
                .expectBody()
                .jsonPath("$.page.totalElements").isEqualTo(1)
                .jsonPath("$.content[0].name").isEqualTo(name)
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
            .jsonPath("$.content[0].name").isEqualTo("XP Infinite")

        restTestClient.get()
            .uri("$ENDPOINT_URL?status=ACTIVE&filter=xp")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(0)
    }

    @Test
    fun `should find a debit card with its wallet`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$DEBIT_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(DEBIT_ID)
            .jsonPath("$.lastFourDigits").isEqualTo("5431")
            .jsonPath("$.wallet.id").isEqualTo(WALLET_ID)
            .jsonPath("$.wallet.name").isEqualTo("Bank account")
            .jsonPath("$.wallet.type").isEqualTo("BANK_ACCOUNT")
    }

    @Test
    fun `should find a credit card without wallet`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$CREDIT_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.invoicePaymentDay").isEqualTo(8)
            .jsonPath("$.active").isEqualTo(false)
            .jsonPath("$.wallet").doesNotExist()
    }

    @Test
    fun `should answer not found when the card does not exist`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should create a credit card on the boundary days`() {

        listOf(1, 30).forEachIndexed { index, day ->
            restTestClient.post()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"name": "Credit $day", "lastFourDigits": "900$index", "type": "CREDIT", "invoicePaymentDay": $day}""")
                .exchange()
                .expectStatus().isCreated
                .expectHeader().value("Location") { location ->
                    assertThat(location).matches("http://localhost:[0-9]+/private/v1/registration/cards/[0-9a-f-]{36}")
                }
        }
    }

    @Test
    fun `should create a debit card with its wallet`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Debit", "lastFourDigits": "9999", "type": "DEBIT", "wallet": "$WALLET_ID"}""")
            .exchange()
            .expectStatus().isCreated

        val created = cardRepository.findAll("9999", null, PageRequest.of(0, 1)).content.single()

        assertThat(created.active).isTrue()
        assertThat(cardRepository.findByExternalId(created.externalId!!)!!.wallet!!.name).isEqualTo("Bank account")
    }

    @Test
    fun `should answer bad request when a debit card has no wallet`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Debit", "lastFourDigits": "9999", "type": "DEBIT"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("debit-card-without-wallet")
    }

    @Test
    fun `should answer bad request when the invoice payment day of a credit card is invalid`() {

        listOf("", ", \"invoicePaymentDay\": 0", ", \"invoicePaymentDay\": 31").forEach { day ->
            restTestClient.post()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"name": "Credit", "lastFourDigits": "9999", "type": "CREDIT"$day}""")
                .exchange()
                .expectStatus().isBadRequest
                .expectBody()
                .jsonPath("$.error").isEqualTo("invalid-invoice-payment-day")
        }
    }

    @Test
    fun `should answer unprocessable content when the required fields are missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "", "lastFourDigits": "12345", "type": null}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.lastFourDigits").isEqualTo("has-max-chars-of-4")
            .jsonPath("$.parameters.type").isEqualTo("is-null")
    }

    @Test
    fun `should answer conflict when the type and last four digits are already taken`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Other", "lastFourDigits": "1234", "type": "CREDIT", "invoicePaymentDay": 5}""")
            .exchange()
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("conflicting-properties")
            .jsonPath("$.parameters['card.type']").isEqualTo("CREDIT")
            .jsonPath("$.parameters['card.last-four-digits']").isEqualTo("1234")
    }

    @Test
    fun `should accept the same digits for another card type`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Other", "lastFourDigits": "1234", "type": "DEBIT", "wallet": "$WALLET_ID"}""")
            .exchange()
            .expectStatus().isCreated
    }

    @Test
    fun `should answer not found when the wallet does not exist`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Debit", "lastFourDigits": "9999", "type": "DEBIT", "wallet": "${UUID.randomUUID()}"}""")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should update the card keeping its type`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$CREDIT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Renamed", "lastFourDigits": "1234", "invoicePaymentDay": 15, "flag": "Master", "active": true}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Renamed")
            .jsonPath("$.type").isEqualTo("CREDIT")
            .jsonPath("$.invoicePaymentDay").isEqualTo(15)
            .jsonPath("$.flag").isEqualTo("Master")
            .jsonPath("$.active").isEqualTo(true)

        val updated = cardRepository.findByExternalId(UUID.fromString(CREDIT_ID))!!

        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.lastUpdate).isNotNull
    }

    @Test
    fun `should replace and remove the wallet on update`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$DEBIT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Itau Personalite", "lastFourDigits": "5431", "wallet": "$OTHER_WALLET_ID", "active": true}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.wallet.name").isEqualTo("Personal")

        restTestClient.put()
            .uri("$ENDPOINT_URL/$DEBIT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Itau Personalite", "lastFourDigits": "5431", "active": true}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("debit-card-without-wallet")
    }

    @Test
    fun `should answer conflict when updating to the digits of another card of the same type`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$DEBIT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Itau Personalite", "lastFourDigits": "5431", "wallet": "$WALLET_ID", "active": true}""")
            .exchange()
            .expectStatus().isOk

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Another debit", "lastFourDigits": "7777", "type": "DEBIT", "wallet": "$WALLET_ID"}""")
            .exchange()
            .expectStatus().isCreated

        restTestClient.put()
            .uri("$ENDPOINT_URL/$DEBIT_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Itau Personalite", "lastFourDigits": "7777", "wallet": "$WALLET_ID", "active": true}""")
            .exchange()
            .expectStatus().isEqualTo(409)
    }

    @Test
    fun `should answer not found when updating an unknown card`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Name", "lastFourDigits": "1111", "active": true}""")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should delete the card`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$CREDIT_ID")
            .exchange()
            .expectStatus().isOk

        assertThat(cardRepository.findByExternalId(UUID.fromString(CREDIT_ID))).isNull()
    }

    @Test
    fun `should answer not found when deleting an unknown card`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should refuse to delete a wallet used by a card`() {

        restTestClient.delete()
            .uri("/private/v1/registration/wallets/$WALLET_ID")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("data-integrity-violation")
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/registration/cards"
        private const val DEBIT_ID = "07a25a3d-ac5c-46b0-9174-24f69b2dc36c"
        private const val CREDIT_ID = "1dc82330-34c9-4f4a-b2ca-14fcd10c299f"
        private const val WALLET_ID = "cd00845c-ae27-47e4-8282-c8df1c42acfe"
        private const val OTHER_WALLET_ID = "d6421251-7b38-4765-88e0-4d70bc3bc4c7"
    }
}
