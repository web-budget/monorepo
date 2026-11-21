package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.math.BigDecimal
import java.util.UUID

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-movements.sql",
    "/sql/financial/create-wallet-entries.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class WalletEntryControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require authentication and the financial role`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(STATEMENT_URL)
            .exchange()
            .expectStatus().isUnauthorized

        authenticateWithRoles("REGISTRATION")

        restTestClient.get()
            .uri(STATEMENT_URL)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should list the statement from the newest to the oldest with the balances`() {

        restTestClient.get()
            .uri(STATEMENT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(4)
            .jsonPath("$.content[0].name").isEqualTo("Rounding")
            .jsonPath("$.content[0].origin").isEqualTo("ADJUSTMENT")
            .jsonPath("$.content[0].direction").isEqualTo("CREDIT")
            .jsonPath("$.content[0].value").isEqualTo(0.5)
            .jsonPath("$.content[0].previousBalance").isEqualTo(500.0)
            .jsonPath("$.content[0].resultingBalance").isEqualTo(500.5)
            .jsonPath("$.content[0].reference").doesNotExist()
            .jsonPath("$.content[0].financialPeriod").doesNotExist()
            .jsonPath("$.content[1].name").isEqualTo("Financial test other wallet")
            .jsonPath("$.content[1].reference.type").isEqualTo("TRANSFER")
            .jsonPath("$.content[1].reference.id").isEqualTo(TRANSFER_ID)
            .jsonPath("$.content[2].name").isEqualTo("Rent")
            .jsonPath("$.content[2].reference.type").isEqualTo("MOVEMENT")
            .jsonPath("$.content[2].reference.id").isEqualTo(GYM_ID)
            .jsonPath("$.content[2].financialPeriod.id").isEqualTo(OPEN_PERIOD)
            .jsonPath("$.content[3].name").isEqualTo("Deposit")
            .jsonPath("$.content[3].reference").doesNotExist()
    }

    @Test
    fun `should filter the statement by date range, inclusive on both ends`() {

        assertTotal("from=2024-12-05", 3)
        assertTotal("to=2024-12-05", 2)
        assertTotal("from=2024-12-05&to=2024-12-05", 1)
        assertTotal("from=2025-01-01", 0)
    }

    @Test
    fun `should filter the statement by period, origin and direction`() {

        assertTotal("financialPeriod=$OPEN_PERIOD", 2)
        assertTotal("origins=TRANSFER", 1)
        assertTotal("origins=INCOME&origins=EXPENSE", 2)
        assertTotal("direction=DEBIT", 2)
        assertTotal("direction=CREDIT", 2)
        assertTotal("origins=EXPENSE&direction=CREDIT", 0)
    }

    @Test
    fun `should filter the statement by text and value range, inclusive on both ends`() {

        assertTotal("filter=RENT", 1)
        assertTotal("filter=other wallet", 1)
        assertTotal("minValue=400", 2)
        assertTotal("maxValue=100", 2)
        assertTotal("minValue=100&maxValue=100", 1)
        assertTotal("filter=rent&minValue=500", 0)
    }

    @Test
    fun `should page and sort the statement`() {

        restTestClient.get()
            .uri("$STATEMENT_URL?sort=value,desc&size=2&page=0")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.content[0].name").isEqualTo("Deposit")
            .jsonPath("$.content[1].name").isEqualTo("Rent")
            .jsonPath("$.page.totalPages").isEqualTo(2)
    }

    @Test
    fun `should answer not found for the statement of an unknown wallet`() {

        restTestClient.get()
            .uri("/private/v1/financial/wallets/${UUID.randomUUID()}/statement")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should credit the wallet with a positive adjustment`() {

        adjust("""{"value": 0.30, "name": "Rounding of the bank"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.origin").isEqualTo("ADJUSTMENT")
            .jsonPath("$.direction").isEqualTo("CREDIT")
            .jsonPath("$.value").isEqualTo(0.3)
            .jsonPath("$.previousBalance").isEqualTo(500.5)
            .jsonPath("$.resultingBalance").isEqualTo(500.8)
            .jsonPath("$.name").isEqualTo("Rounding of the bank")

        assertThat(balanceOf(9101L)).isEqualByComparingTo("500.80")
    }

    @Test
    fun `should debit the wallet with a negative adjustment`() {

        adjust("""{"value": -0.50, "name": "Fee"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.direction").isEqualTo("DEBIT")
            .jsonPath("$.value").isEqualTo(0.5)
            .jsonPath("$.resultingBalance").isEqualTo(500.0)

        val entry = dsl.selectFrom(WALLET_ENTRIES).where(WALLET_ENTRIES.NAME.eq("Fee")).fetchSingle()

        assertThat(entry.origin).isEqualTo("ADJUSTMENT")
        assertThat(entry.idMovement).isNull()
        assertThat(entry.idFinancialPeriod).isNull()
    }

    @Test
    fun `should refuse an adjustment that is zero, has no name or targets an inactive or unknown wallet`() {

        adjust("""{"value": 0, "name": "Nothing"}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-adjustment-value")

        adjust("""{"name": " "}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.value").isEqualTo("is-null")
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")

        restTestClient.post()
            .uri("/private/v1/financial/wallets/$INACTIVE_WALLET/adjustments")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": 1, "name": "Inactive"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-wallet")

        restTestClient.post()
            .uri("/private/v1/financial/wallets/${UUID.randomUUID()}/adjustments")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": 1, "name": "Unknown"}""")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should not count the adjustment in the result of the period`() {

        adjust("""{"value": 10.00, "name": "Rounding"}""").expectStatus().isOk

        restTestClient.get()
            .uri("/private/v1/financial/financial-periods/$OPEN_PERIOD/result")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.revenues").isEqualTo(0)
            .jsonPath("$.expenses").isEqualTo(0)
            .jsonPath("$.result").isEqualTo(0)
    }

    private fun assertTotal(query: String, expected: Int) {
        restTestClient.get()
            .uri("$STATEMENT_URL?$query")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(expected)
    }

    private fun adjust(body: String) = restTestClient.post()
        .uri("/private/v1/financial/wallets/$WALLET/adjustments")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun balanceOf(walletId: Long): BigDecimal =
        dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(walletId)).fetchSingle().value1()!!

    companion object {
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val INACTIVE_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a02"
        private const val STATEMENT_URL = "/private/v1/financial/wallets/$WALLET/statement"
        private const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val GYM_ID = "4a26f975-c9a9-4231-958c-9b59ee55e04f"
        private const val TRANSFER_ID = "0b6e0c4a-6f3e-4c55-8a39-0d3c1c1f9a01"
    }
}
