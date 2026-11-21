package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.financial.Transfer
import br.com.webbudget.server.domain.services.financial.TransferService
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.jooq.financial.tables.references.TRANSFERS
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
import java.util.concurrent.Callable
import java.util.concurrent.Executors

@Sql("/sql/financial/clear-tables.sql", "/sql/financial/create-registration-data.sql")
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class TransferControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var transferService: TransferService

    @Autowired
    private lateinit var movementReferenceRepository: MovementReferenceRepository

    @Test
    fun `should require authentication and the financial role`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isUnauthorized

        authenticateWithRoles("REGISTRATION")

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should move the money between the wallets and link the two entries`() {

        transfer(WALLET, OTHER_WALLET, "50.00", """, "description": "Savings" """)
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location).matches("http://localhost:[0-9]+/private/v1/financial/transfers/[0-9a-f-]{36}")
            }

        assertThat(balanceOf(9101L)).isEqualByComparingTo("-50.00")
        assertThat(balanceOf(9103L)).isEqualByComparingTo("50.00")

        val transfer = dsl.selectFrom(TRANSFERS).fetchSingle()
        val entries = dsl.selectFrom(WALLET_ENTRIES).orderBy(WALLET_ENTRIES.ID).fetch()

        assertThat(entries).hasSize(2)
        assertThat(entries.map { it.idTransfer }).containsOnly(transfer.id)
        assertThat(entries.map { it.origin }).containsOnly("TRANSFER")
        assertThat(entries.map { it.direction }).containsExactly("DEBIT", "CREDIT")
        assertThat(entries.map { it.name }).containsExactly("Financial test other wallet", "Financial test wallet")
        assertThat(entries.map { it.idFinancialPeriod }).containsOnlyNulls()
        assertThat(entries[0].previousBalance).isEqualByComparingTo("0")
        assertThat(entries[0].resultingBalance).isEqualByComparingTo("-50.00")
        assertThat(entries[1].resultingBalance).isEqualByComparingTo("50.00")
        assertThat(balanceOf(9101L).add(balanceOf(9103L))).isEqualByComparingTo("0")
    }

    @Test
    fun `should find a transfer by id`() {

        transfer(WALLET, OTHER_WALLET, "50.00", """, "description": "Savings" """).expectStatus().isCreated

        restTestClient.get()
            .uri("$ENDPOINT_URL/${lastTransferId()}")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.value").isEqualTo(50.0)
            .jsonPath("$.description").isEqualTo("Savings")
            .jsonPath("$.fromWallet.id").isEqualTo(WALLET)
            .jsonPath("$.toWallet.name").isEqualTo("Financial test other wallet")
            .jsonPath("$.returned").isEqualTo(false)
            .jsonPath("$.returnedTransfer").doesNotExist()

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should refuse an invalid transfer`() {

        transfer(WALLET, WALLET, "10.00")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("transfer-between-same-wallet")

        transfer(WALLET, INACTIVE_WALLET, "10.00")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-wallet")

        transfer(WALLET, UUID.randomUUID().toString(), "10.00").expectStatus().isNotFound
        transfer(UUID.randomUUID().toString(), WALLET, "10.00").expectStatus().isNotFound

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": 0}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.fromWallet").isEqualTo("is-null")
            .jsonPath("$.parameters.toWallet").isEqualTo("is-null")
            .jsonPath("$.parameters.value").isEqualTo("is-not-positive")

        assertThat(dsl.fetchCount(TRANSFERS)).isZero()
        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isZero()
    }

    @Test
    fun `should not edit nor delete a transfer`() {

        transfer(WALLET, OTHER_WALLET, "50.00").expectStatus().isCreated

        restTestClient.put()
            .uri("$ENDPOINT_URL/${lastTransferId()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": 1}""")
            .exchange()
            .expectStatus().isEqualTo(405)

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${lastTransferId()}")
            .exchange()
            .expectStatus().isEqualTo(405)
    }

    @Test
    fun `should not change the result of the period`() {

        transfer(WALLET, OTHER_WALLET, "50.00").expectStatus().isCreated

        restTestClient.get()
            .uri("/private/v1/financial/financial-periods/$OPEN_PERIOD/result")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.result").isEqualTo(0)
    }

    @Test
    fun `should return a transfer by creating the opposite one only once`() {

        transfer(WALLET, OTHER_WALLET, "50.00", """, "description": "Savings" """).expectStatus().isCreated

        val original = lastTransferId()

        returnTransfer(original)
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location).matches("http://localhost:[0-9]+/private/v1/financial/transfers/[0-9a-f-]{36}")
            }

        assertThat(balanceOf(9101L)).isEqualByComparingTo("0")
        assertThat(balanceOf(9103L)).isEqualByComparingTo("0")

        val returning = lastTransferId()

        restTestClient.get()
            .uri("$ENDPOINT_URL/$returning")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.fromWallet.id").isEqualTo(OTHER_WALLET)
            .jsonPath("$.toWallet.id").isEqualTo(WALLET)
            .jsonPath("$.value").isEqualTo(50.0)
            .jsonPath("$.returnedTransfer").isEqualTo(original)
            .jsonPath("$.returned").isEqualTo(false)

        restTestClient.get()
            .uri("$ENDPOINT_URL/$original")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.returned").isEqualTo(true)

        returnTransfer(original)
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("transfer-already-returned")

        returnTransfer(returning).expectStatus().isCreated

        assertThat(balanceOf(9101L)).isEqualByComparingTo("-50.00")
        assertThat(dsl.fetchCount(TRANSFERS)).isEqualTo(3)
    }

    @Test
    fun `should answer not found when returning an unknown transfer`() {

        returnTransfer(UUID.randomUUID().toString()).expectStatus().isNotFound
    }

    @Test
    fun `should keep both balances consistent under opposite concurrent transfers`() {

        val first = movementReferenceRepository.findWallet(UUID.fromString(WALLET))!!
        val second = movementReferenceRepository.findWallet(UUID.fromString(OTHER_WALLET))!!

        val executor = Executors.newFixedThreadPool(4)

        try {
            executor.invokeAll(
                (1..10).map { number ->
                    Callable {
                        val transfer = if (number % 2 == 0) {
                            Transfer(first, second, BigDecimal("10.00"))
                        } else {
                            Transfer(second, first, BigDecimal("5.00"))
                        }
                        transferService.transfer(transfer)
                    }
                }
            ).forEach { it.get() }
        } finally {
            executor.shutdown()
        }

        assertThat(balanceOf(9101L)).isEqualByComparingTo("-25.00")
        assertThat(balanceOf(9103L)).isEqualByComparingTo("25.00")

        listOf(9101L, 9103L).forEach { walletId ->
            val entries = dsl.selectFrom(WALLET_ENTRIES)
                .where(WALLET_ENTRIES.ID_WALLET.eq(walletId))
                .orderBy(WALLET_ENTRIES.ID)
                .fetch()

            assertThat(entries).hasSize(10)
            assertThat(entries.last().resultingBalance).isEqualByComparingTo(balanceOf(walletId))
            entries.zipWithNext().forEach { (previous, next) ->
                assertThat(next.previousBalance).isEqualByComparingTo(previous.resultingBalance)
            }
        }
    }

    private fun transfer(from: String, to: String, value: String, extra: String = "") = restTestClient.post()
        .uri(ENDPOINT_URL)
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"fromWallet": "$from", "toWallet": "$to", "value": $value$extra}""")
        .exchange()

    private fun returnTransfer(id: String) = restTestClient.post()
        .uri("$ENDPOINT_URL/$id/return")
        .exchange()

    private fun lastTransferId(): String =
        dsl.select(TRANSFERS.EXTERNAL_ID).from(TRANSFERS).orderBy(TRANSFERS.ID.desc()).limit(1).fetchSingle().value1().toString()

    private fun balanceOf(walletId: Long): BigDecimal =
        dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(walletId)).fetchSingle().value1()!!

    companion object {
        private const val ENDPOINT_URL = "/private/v1/financial/transfers"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val INACTIVE_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a02"
        private const val OTHER_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a05"
        private const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
    }
}
