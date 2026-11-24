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
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
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
            .jsonPath("$.description").isEqualTo(
                "Devolução da transferência de ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))}"
            )
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

        returnTransfer(returning)
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("transfer-is-a-return")

        assertThat(balanceOf(9101L)).isEqualByComparingTo("0")
        assertThat(balanceOf(9103L)).isEqualByComparingTo("0")
        assertThat(dsl.fetchCount(TRANSFERS)).isEqualTo(2)
        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isEqualTo(4)
    }

    @Test
    fun `should tell on the statement lines whether the transfer is a return and can still be returned`() {

        transfer(WALLET, OTHER_WALLET, "50.00").expectStatus().isCreated
        val common = lastTransferId()

        transfer(WALLET, OTHER_WALLET, "20.00").expectStatus().isCreated
        val original = lastTransferId()

        returnTransfer(original).expectStatus().isCreated
        val returning = lastTransferId()

        restTestClient.get()
            .uri("/private/v1/financial/wallets/$WALLET/statement?origins=TRANSFER&sort=createdOn,asc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].reference.id").isEqualTo(common)
            .jsonPath("$.content[0].reference.returnTransfer").isEqualTo(false)
            .jsonPath("$.content[0].reference.returnable").isEqualTo(true)
            .jsonPath("$.content[1].reference.id").isEqualTo(original)
            .jsonPath("$.content[1].reference.returnTransfer").isEqualTo(false)
            .jsonPath("$.content[1].reference.returnable").isEqualTo(false)
            .jsonPath("$.content[2].reference.id").isEqualTo(returning)
            .jsonPath("$.content[2].reference.returnTransfer").isEqualTo(true)
            .jsonPath("$.content[2].reference.returnable").isEqualTo(false)
    }

    @Test
    fun `should tell whether a transfer was returned, is a return or can still be returned`() {

        transfer(WALLET, OTHER_WALLET, "50.00").expectStatus().isCreated
        val common = lastTransferId()

        transfer(WALLET, OTHER_WALLET, "20.00").expectStatus().isCreated
        val original = lastTransferId()

        returnTransfer(original).expectStatus().isCreated
        val returning = lastTransferId()

        restTestClient.get().uri("$ENDPOINT_URL/$common").exchange()
            .expectBody()
            .jsonPath("$.returnable").isEqualTo(true)
            .jsonPath("$.returnOf").doesNotExist()
            .jsonPath("$.returnedBy").doesNotExist()

        restTestClient.get().uri("$ENDPOINT_URL/$original").exchange()
            .expectBody()
            .jsonPath("$.returnable").isEqualTo(false)
            .jsonPath("$.returned").isEqualTo(true)
            .jsonPath("$.returnedBy.id").isEqualTo(returning)
            .jsonPath("$.returnedBy.createdOn").isNotEmpty
            .jsonPath("$.returnOf").doesNotExist()

        restTestClient.get().uri("$ENDPOINT_URL/$returning").exchange()
            .expectBody()
            .jsonPath("$.returnable").isEqualTo(false)
            .jsonPath("$.returned").isEqualTo(false)
            .jsonPath("$.returnOf.id").isEqualTo(original)
            .jsonPath("$.returnOf.createdOn").isNotEmpty
            .jsonPath("$.returnedBy").doesNotExist()
    }

    @Test
    fun `should list the transfers from the newest to the oldest with the return state of each one`() {

        transfer(WALLET, OTHER_WALLET, "10.00", """, "description": "Rent split" """).expectStatus().isCreated
        val first = lastTransferId()
        transfer(OTHER_WALLET, WALLET, "30.00", """, "description": "Groceries" """).expectStatus().isCreated
        val second = lastTransferId()
        returnTransfer(first).expectStatus().isCreated
        val returning = lastTransferId()

        setCreatedOn(first, LocalDateTime.of(2026, 11, 1, 9, 0))
        setCreatedOn(second, LocalDateTime.of(2026, 11, 10, 18, 30))
        setCreatedOn(returning, LocalDateTime.of(2026, 11, 20, 10, 5))

        restTestClient.get().uri(ENDPOINT_URL).exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.content[0].id").isEqualTo(returning)
            .jsonPath("$.content[1].id").isEqualTo(second)
            .jsonPath("$.content[2].id").isEqualTo(first)
            .jsonPath("$.content[0].returnOf.id").isEqualTo(first)
            .jsonPath("$.content[0].returnable").isEqualTo(false)
            .jsonPath("$.content[1].returnable").isEqualTo(true)
            .jsonPath("$.content[2].returnedBy.id").isEqualTo(returning)
            .jsonPath("$.content[2].returnable").isEqualTo(false)
    }

    @Test
    fun `should filter the transfers by wallet, dates and text`() {

        transfer(WALLET, OTHER_WALLET, "10.00", """, "description": "Rent split" """).expectStatus().isCreated
        val rent = lastTransferId()
        transfer(OTHER_WALLET, WALLET, "30.00", """, "description": "Groceries" """).expectStatus().isCreated
        val groceries = lastTransferId()

        setCreatedOn(rent, LocalDateTime.of(2026, 11, 1, 9, 0))
        setCreatedOn(groceries, LocalDateTime.of(2026, 11, 10, 18, 30))

        assertIds("wallet=$WALLET", groceries, rent)
        assertIds("wallet=$OTHER_WALLET", groceries, rent)
        assertIds("wallet=${UUID.randomUUID()}")
        assertIds("from=2026-11-10", groceries)
        assertIds("to=2026-11-01", rent)
        assertIds("from=2026-11-01&to=2026-11-10", groceries, rent)
        assertIds("from=2026-11-02&to=2026-11-09")
        assertIds("filter=rent", rent)
        assertIds("filter=OTHER", groceries, rent)
        assertIds("filter=wallet", groceries, rent)
        assertIds("filter=nothing")
        assertIds("wallet=$WALLET&filter=gro&from=2026-11-10&to=2026-11-10", groceries)
    }

    @Test
    fun `should sort the transfers by date, value and wallet names and ignore name`() {

        transfer(WALLET, OTHER_WALLET, "30.00").expectStatus().isCreated
        val big = lastTransferId()
        transfer(OTHER_WALLET, WALLET, "10.00").expectStatus().isCreated
        val small = lastTransferId()

        setCreatedOn(big, LocalDateTime.of(2026, 11, 1, 9, 0))
        setCreatedOn(small, LocalDateTime.of(2026, 11, 10, 9, 0))

        assertIds("", small, big)
        assertIds("sort=name,asc", small, big)
        assertIds("sort=createdOn,asc", big, small)
        assertIds("sort=value,asc", small, big)
        assertIds("sort=value,desc", big, small)
        assertIds("sort=fromWallet,asc", small, big)
        assertIds("sort=fromWallet,desc", big, small)
        assertIds("sort=toWallet,asc", big, small)
    }

    @Test
    fun `should page the transfers`() {

        repeat(3) { transfer(WALLET, OTHER_WALLET, "10.00").expectStatus().isCreated }

        restTestClient.get().uri("$ENDPOINT_URL?size=2&page=1").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.page.totalPages").isEqualTo(2)
    }

    @Test
    fun `should require the financial role to list the transfers`() {

        authenticateWithRoles("REGISTRATION")

        restTestClient.get().uri(ENDPOINT_URL).exchange().expectStatus().isForbidden
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

    private fun setCreatedOn(transferId: String, createdOn: LocalDateTime) {
        dsl.update(TRANSFERS)
            .set(TRANSFERS.CREATED_ON, createdOn)
            .where(TRANSFERS.EXTERNAL_ID.eq(UUID.fromString(transferId)))
            .execute()
    }

    private fun assertIds(query: String, vararg expected: String) {

        val ids = mutableListOf<String>()

        restTestClient.get()
            .uri("$ENDPOINT_URL?size=50&$query")
            .exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                @Suppress("UNCHECKED_CAST")
                (body!!["content"] as List<Map<String, Any?>>).mapTo(ids) { it["id"] as String }
            }

        assertThat(ids).containsExactly(*expected)
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
