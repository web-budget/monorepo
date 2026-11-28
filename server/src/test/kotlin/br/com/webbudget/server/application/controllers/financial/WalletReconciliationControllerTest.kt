package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_RECONCILIATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COMPARTMENTS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.SqlMergeMode
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID
import java.util.concurrent.CompletableFuture

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-movements.sql",
    "/sql/financial/create-wallet-entries.sql",
    "/sql/financial/create-wallet-reconciliations.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
@SqlMergeMode(SqlMergeMode.MergeMode.MERGE)
class WalletReconciliationControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require authentication and the financial role`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(RECONCILIATIONS_URL)
            .exchange()
            .expectStatus().isUnauthorized

        authenticateWithRoles("REGISTRATION")

        restTestClient.get()
            .uri(RECONCILIATIONS_URL)
            .exchange()
            .expectStatus().isForbidden

        restTestClient.post()
            .uri(RECONCILIATIONS_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body(body("600.50", "500.50", "Reason"))
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should credit the wallet up to the informed balance and register the reconciliation`() {

        reconcile(WALLET, body("600.50", "500.50", "Bonus of the bank"))
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.reconciliation.informedBalance").isEqualTo(600.5)
            .jsonPath("$.reconciliation.walletBalance").isEqualTo(500.5)
            .jsonPath("$.reconciliation.difference").isEqualTo(100.0)
            .jsonPath("$.reconciliation.reason").isEqualTo("Bonus of the bank")
            .jsonPath("$.entry.origin").isEqualTo("ADJUSTMENT")
            .jsonPath("$.entry.direction").isEqualTo("CREDIT")
            .jsonPath("$.entry.value").isEqualTo(100.0)
            .jsonPath("$.entry.previousBalance").isEqualTo(500.5)
            .jsonPath("$.entry.resultingBalance").isEqualTo(600.5)
            .jsonPath("$.entry.name").isEqualTo("Bonus of the bank")
            .jsonPath("$.entry.reference.type").isEqualTo("RECONCILIATION")
            .jsonPath("$.entry.financialPeriod").doesNotExist()
            .returnResult()
            .let { result -> String(result.responseBody!!) }
            .also { response ->
                val entryId = entryExternalId("Bonus of the bank")
                assertThat(response).contains("\"id\":\"$entryId\"").contains("\"entryId\":\"$entryId\"")
            }

        assertThat(balanceOf(WALLET_ID)).isEqualByComparingTo("600.50")
        assertThat(reconciliationsOf(WALLET_ID)).isEqualTo(1)

        val entry = dsl.selectFrom(WALLET_ENTRIES).where(WALLET_ENTRIES.NAME.eq("Bonus of the bank")).fetchSingle()

        assertThat(entry.idMovement).isNull()
        assertThat(entry.idFinancialPeriod).isNull()
        assertThat(entry.idTransfer).isNull()
    }

    @Test
    fun `should debit the wallet down to a negative informed balance`() {

        reconcile(WALLET, body("-10", "500.50", "Overdraft"))
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.reconciliation.difference").isEqualTo(-510.5)
            .jsonPath("$.entry.direction").isEqualTo("DEBIT")
            .jsonPath("$.entry.value").isEqualTo(510.5)
            .jsonPath("$.entry.resultingBalance").isEqualTo(-10.0)

        assertThat(balanceOf(WALLET_ID)).isEqualByComparingTo("-10.00")
    }

    @Test
    fun `should trim the reason and name the entry after it`() {

        reconcile(WALLET, body("501.00", "500.50", "  Cents of the bank  "))
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.reconciliation.reason").isEqualTo("Cents of the bank")
            .jsonPath("$.entry.name").isEqualTo("Cents of the bank")
    }

    @Test
    fun `should round the balances to cents so the wallet ends at the informed balance`() {

        reconcile(WALLET, body("600.505", "500.500", "Rounding"))
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.reconciliation.informedBalance").isEqualTo(600.51)

        assertThat(balanceOf(WALLET_ID)).isEqualByComparingTo("600.51")
    }

    @Test
    fun `should accept a reason of exactly 150 characters`() {

        reconcile(WALLET, body("600.50", "500.50", "a".repeat(150))).expectStatus().isCreated
    }

    @Test
    fun `should refuse the reconciliation of an inactive wallet and record nothing`() {

        reconcile(INACTIVE_WALLET, body("10", "0", "Inactive"))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-wallet")

        assertNothingRecorded(INACTIVE_WALLET_ID, "0.00")
    }

    @Test
    fun `should refuse and tell the new balance and difference when the balance changed after it was shown`() {

        reconcile(WALLET, body("600.50", "400.00", "Changed"))
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("reconciliation-balance-changed")
            .jsonPath("$.parameters.currentBalance").isEqualTo(500.5)
            .jsonPath("$.parameters.difference").isEqualTo(100.0)

        assertNothingRecorded(WALLET_ID, "500.50")
    }

    @Test
    fun `should tell the balance changed even when the new difference is zero`() {

        reconcile(WALLET, body("500.50", "400.00", "Changed"))
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("reconciliation-balance-changed")
            .jsonPath("$.parameters.difference").isEqualTo(0)

        assertNothingRecorded(WALLET_ID, "500.50")
    }

    @Test
    fun `should refuse a reconciliation without difference and record nothing`() {

        reconcile(WALLET, body("500.50", "500.50", "Same"))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("reconciliation-without-difference")

        reconcile(WALLET, body("500.5", "500.500", "Same"))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("reconciliation-without-difference")

        assertNothingRecorded(WALLET_ID, "500.50")
    }

    @Test
    fun `should refuse an empty, blank or too long reason and record nothing`() {

        listOf("""{"informedBalance": 600, "shownBalance": 500.50}""", """{"informedBalance": 600, "shownBalance": 500.50, "reason": ""}""")
            .forEach { payload ->
                reconcile(WALLET, payload)
                    .expectStatus().isBadRequest
                    .expectBody()
                    .jsonPath("$.error").isEqualTo("invalid-reconciliation-reason")
            }

        reconcile(WALLET, body("600", "500.50", "   "))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-reconciliation-reason")

        reconcile(WALLET, body("600", "500.50", "a".repeat(151)))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-reconciliation-reason")

        assertNothingRecorded(WALLET_ID, "500.50")
    }

    @Test
    fun `should require both balances and answer not found for an unknown wallet`() {

        reconcile(WALLET, """{"shownBalance": 500.50, "reason": "Missing"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.informedBalance").isEqualTo("is-null")

        reconcile(WALLET, """{"informedBalance": 600, "reason": "Missing"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.shownBalance").isEqualTo("is-null")

        reconcile(UUID.randomUUID().toString(), body("600", "500.50", "Unknown"))
            .expectStatus().isNotFound

        assertNothingRecorded(WALLET_ID, "500.50")
    }

    @Test
    fun `should refuse balances out of the range of the wallet balance without expanding them`() {

        reconcile(WALLET, """{"informedBalance": 1e1000000000, "shownBalance": 500.50, "reason": "Huge"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.informedBalance").isEqualTo("is-out-of-range")

        reconcile(WALLET, """{"informedBalance": 600, "shownBalance": 99999999999999.99, "reason": "Big"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.shownBalance").isEqualTo("is-out-of-range")

        assertNothingRecorded(WALLET_ID, "500.50")
    }

    @Test
    fun `should let only one of two simultaneous reconciliations of the same shown balance through`() {

        val first = CompletableFuture.supplyAsync {
            reconcile(WALLET, body("600", "500.50", "First")).returnResult(String::class.java).status.value()
        }
        val second = CompletableFuture.supplyAsync {
            reconcile(WALLET, body("700", "500.50", "Second")).returnResult(String::class.java).status.value()
        }

        val statuses = listOf(first.join(), second.join())

        assertThat(statuses).containsExactlyInAnyOrder(201, 409)
        assertThat(reconciliationsOf(WALLET_ID)).isEqualTo(1)
    }

    @Test
    fun `should not count the adjustment in the result of the period`() {

        reconcile(WALLET, body("510.50", "500.50", "Adjustment")).expectStatus().isCreated

        restTestClient.get()
            .uri("/private/v1/financial/financial-periods/$OPEN_PERIOD/result")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.revenues").isEqualTo(0)
            .jsonPath("$.expenses").isEqualTo(0)
            .jsonPath("$.result").isEqualTo(0)
    }

    @Test
    fun `should list the history from the newest to the oldest, paged`() {

        restTestClient.get()
            .uri("$HISTORY_URL?size=2&page=0")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.page.totalPages").isEqualTo(2)
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.content[0].id").isEqualTo(NEWEST_RECONCILIATION)
            .jsonPath("$.content[0].createdOn").isEqualTo("2024-12-18T09:30:00")
            .jsonPath("$.content[0].informedBalance").isEqualTo(95.5)
            .jsonPath("$.content[0].walletBalance").isEqualTo(95.0)
            .jsonPath("$.content[0].difference").isEqualTo(0.5)
            .jsonPath("$.content[0].reason").isEqualTo("Rounding of the bank")
            .jsonPath("$.content[0].entryId").isEqualTo(NEWEST_ENTRY)
            .jsonPath("$.content[1].difference").isEqualTo(-15.0)

        restTestClient.get()
            .uri("$HISTORY_URL?size=2&page=1")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.content[0].reason").isEqualTo("Interest of the bank")
    }

    @Test
    fun `should list an empty history for a wallet never reconciled and answer not found for an unknown one`() {

        restTestClient.get()
            .uri(RECONCILIATIONS_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(0)

        restTestClient.get()
            .uri("/private/v1/financial/wallets/${UUID.randomUUID()}/reconciliations")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should tell the position of a reconciliation in the history`() {

        assertPosition(NEWEST_RECONCILIATION, 0)
        assertPosition(MIDDLE_RECONCILIATION, 1)
        assertPosition(OLDEST_RECONCILIATION, 2)
    }

    @Test
    fun `should break a tie of dates by the newest id when telling the position`() {

        dsl.update(WALLET_RECONCILIATIONS)
            .set(WALLET_RECONCILIATIONS.CREATED_ON, LocalDateTime.of(2024, 12, 18, 9, 30))
            .where(WALLET_RECONCILIATIONS.ID.`in`(9111L, 9112L))
            .execute()

        assertPosition(NEWEST_RECONCILIATION, 0)
        assertPosition(MIDDLE_RECONCILIATION, 1)
        assertPosition(OLDEST_RECONCILIATION, 2)
    }

    @Test
    fun `should answer not found for the position of an unknown reconciliation, one of another wallet or of an unknown wallet`() {

        restTestClient.get()
            .uri("$HISTORY_URL/${UUID.randomUUID()}/position")
            .exchange()
            .expectStatus().isNotFound

        restTestClient.get()
            .uri("$RECONCILIATIONS_URL/$NEWEST_RECONCILIATION/position")
            .exchange()
            .expectStatus().isNotFound

        restTestClient.get()
            .uri("/private/v1/financial/wallets/${UUID.randomUUID()}/reconciliations/$NEWEST_RECONCILIATION/position")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should tell the last reconciliation in the wallet detail, and nothing when there is none`() {

        restTestClient.get()
            .uri("/private/v1/registration/wallets/$OTHER_WALLET")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.lastReconciliation.id").isEqualTo(NEWEST_RECONCILIATION)
            .jsonPath("$.lastReconciliation.createdOn").isEqualTo("2024-12-18T09:30:00")
            .jsonPath("$.lastReconciliation.difference").isEqualTo(0.5)

        restTestClient.get()
            .uri("/private/v1/registration/wallets/$WALLET")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.lastReconciliation").doesNotExist()

        reconcile(WALLET, body("600.50", "500.50", "Interest")).expectStatus().isCreated

        restTestClient.get()
            .uri("/private/v1/registration/wallets/$WALLET")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.lastReconciliation.difference").isEqualTo(100.0)
    }

    @Test
    fun `should link the adjustment of a reconciliation in the statement list and detail`() {

        restTestClient.get()
            .uri("/private/v1/financial/wallets/$OTHER_WALLET/statement")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(4)
            .jsonPath("$.content[0].name").isEqualTo("Rounding of the bank")
            .jsonPath("$.content[0].reference.type").isEqualTo("RECONCILIATION")
            .jsonPath("$.content[0].reference.id").isEqualTo(NEWEST_RECONCILIATION)
            .jsonPath("$.content[0].reconciliation").doesNotExist()
            .jsonPath("$.content[3].reference.type").isEqualTo("TRANSFER")

        restTestClient.get()
            .uri("/private/v1/financial/wallets/$OTHER_WALLET/statement/$NEWEST_ENTRY")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reference.type").isEqualTo("RECONCILIATION")
            .jsonPath("$.reconciliation.id").isEqualTo(NEWEST_RECONCILIATION)
            .jsonPath("$.reconciliation.createdOn").isEqualTo("2024-12-18T09:30:00")
            .jsonPath("$.reconciliation.informedBalance").isEqualTo(95.5)
            .jsonPath("$.reconciliation.walletBalance").isEqualTo(95.0)
            .jsonPath("$.reconciliation.difference").isEqualTo(0.5)
            .jsonPath("$.reconciliation.reason").isEqualTo("Rounding of the bank")
            .jsonPath("$.reconciliation.entryId").isEqualTo(NEWEST_ENTRY)
    }

    @Test
    fun `should keep filtering the statement by the adjustment origin`() {

        restTestClient.get()
            .uri("/private/v1/financial/wallets/$OTHER_WALLET/statement?origins=ADJUSTMENT")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)
    }

    @Test
    @Sql("/sql/financial/create-reconciliation-compartments.sql")
    fun `should refuse a reconciliation of the total of a wallet with compartments and record nothing`() {

        reconcile(WALLET, body("1750.75", "1750.75", "Same total"))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("reconciliation-without-difference")

        assertNothingRecorded(WALLET_ID, "500.50")
    }

    @Test
    @Sql("/sql/financial/create-reconciliation-compartments.sql")
    fun `should adjust the free balance by the difference against the total and keep the compartments`() {

        reconcile(WALLET, body("2000.75", "1750.75", "Bonus of the bank"))
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.reconciliation.informedBalance").isEqualTo(2000.75)
            .jsonPath("$.reconciliation.walletBalance").isEqualTo(1750.75)
            .jsonPath("$.reconciliation.difference").isEqualTo(250.0)
            .jsonPath("$.entry.direction").isEqualTo("CREDIT")
            .jsonPath("$.entry.value").isEqualTo(250.0)
            .jsonPath("$.entry.previousBalance").isEqualTo(500.5)
            .jsonPath("$.entry.resultingBalance").isEqualTo(750.5)

        assertThat(balanceOf(WALLET_ID)).isEqualByComparingTo("750.50")
        assertThat(compartmentBalanceOf(9201L)).isEqualByComparingTo("1000.00")
        assertThat(compartmentBalanceOf(9202L)).isEqualByComparingTo("250.25")
        assertThat(
            dsl.select(WALLET_RECONCILIATIONS.WALLET_BALANCE).from(WALLET_RECONCILIATIONS)
                .where(WALLET_RECONCILIATIONS.ID_WALLET.eq(WALLET_ID)).fetchSingle().value1()!!
        ).isEqualByComparingTo("1750.75")
    }

    @Test
    @Sql("/sql/financial/create-reconciliation-compartments.sql")
    fun `should tell the total, the free balance and the compartments when the shown balance is the free one`() {

        reconcile(WALLET, body("2000.75", "500.50", "Free shown"))
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("reconciliation-balance-changed")
            .jsonPath("$.parameters.currentBalance").isEqualTo(1750.75)
            .jsonPath("$.parameters.difference").isEqualTo(250.0)
            .jsonPath("$.parameters.freeBalance").isEqualTo(500.5)
            .jsonPath("$.parameters.compartments.length()").isEqualTo(2)
            .jsonPath("$.parameters.compartments[0].id").isEqualTo(EMERGENCY_COMPARTMENT)
            .jsonPath("$.parameters.compartments[0].name").isEqualTo("Emergency")
            .jsonPath("$.parameters.compartments[0].balance").isEqualTo(1000.0)
            .jsonPath("$.parameters.compartments[1].name").isEqualTo("Stocks")

        assertNothingRecorded(WALLET_ID, "500.50")
    }

    @Test
    @Sql("/sql/financial/create-reconciliation-compartments.sql")
    fun `should not conflict when money moves between the free balance and a compartment after the dialog was opened`() {

        restTestClient.post()
            .uri("/private/v1/financial/wallets/$WALLET/compartments/$EMERGENCY_COMPARTMENT/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"direction": "DEPOSIT", "value": 100.00}""")
            .exchange()
            .expectStatus().isCreated

        reconcile(WALLET, body("2000.75", "1750.75", "After deposit"))
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.reconciliation.walletBalance").isEqualTo(1750.75)
            .jsonPath("$.reconciliation.difference").isEqualTo(250.0)
            .jsonPath("$.entry.resultingBalance").isEqualTo(650.5)

        restTestClient.post()
            .uri("/private/v1/financial/wallets/$WALLET/compartments/$EMERGENCY_COMPARTMENT/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"direction": "WITHDRAWAL", "value": 50.00}""")
            .exchange()
            .expectStatus().isCreated

        reconcile(WALLET, body("2100.75", "2000.75", "After withdrawal"))
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.reconciliation.difference").isEqualTo(100.0)
    }

    @Test
    @Sql("/sql/financial/create-reconciliation-compartments.sql")
    fun `should conflict when an entry of the free balance happens after the dialog was opened`() {

        restTestClient.post()
            .uri("/private/v1/financial/transfers")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"fromWallet": "$WALLET", "toWallet": "$OTHER_WALLET", "value": 10.00}""")
            .exchange()
            .expectStatus().isCreated

        reconcile(WALLET, body("2000.75", "1750.75", "After transfer"))
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("reconciliation-balance-changed")
            .jsonPath("$.parameters.currentBalance").isEqualTo(1740.75)
            .jsonPath("$.parameters.freeBalance").isEqualTo(490.5)
            .jsonPath("$.parameters.compartments.length()").isEqualTo(2)
    }

    @Test
    @Sql("/sql/financial/create-reconciliation-compartments.sql")
    fun `should tell the free balance, the total and the compartments of a wallet`() {

        restTestClient.get()
            .uri("$RECONCILIATIONS_URL/balance")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.freeBalance").isEqualTo(500.5)
            .jsonPath("$.totalBalance").isEqualTo(1750.75)
            .jsonPath("$.compartments.length()").isEqualTo(2)
            .jsonPath("$.compartments[0].id").isEqualTo(EMERGENCY_COMPARTMENT)
            .jsonPath("$.compartments[0].name").isEqualTo("Emergency")
            .jsonPath("$.compartments[0].balance").isEqualTo(1000.0)
            .jsonPath("$.compartments[1].name").isEqualTo("Stocks")
            .jsonPath("$.compartments[1].balance").isEqualTo(250.25)
    }

    @Test
    fun `should tell the balance of a wallet without compartments, and refuse an unknown wallet or a missing role`() {

        restTestClient.get()
            .uri("$RECONCILIATIONS_URL/balance")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.freeBalance").isEqualTo(500.5)
            .jsonPath("$.totalBalance").isEqualTo(500.5)
            .jsonPath("$.compartments.length()").isEqualTo(0)

        restTestClient.get()
            .uri("/private/v1/financial/wallets/${UUID.randomUUID()}/reconciliations/balance")
            .exchange()
            .expectStatus().isNotFound

        authenticateWithRoles("REGISTRATION")

        restTestClient.get()
            .uri("$RECONCILIATIONS_URL/balance")
            .exchange()
            .expectStatus().isForbidden
    }

    private fun compartmentBalanceOf(compartmentId: Long): BigDecimal =
        dsl.select(COMPARTMENTS.BALANCE).from(COMPARTMENTS).where(COMPARTMENTS.ID.eq(compartmentId)).fetchSingle().value1()!!

    private fun body(informedBalance: String, shownBalance: String, reason: String) =
        """{"informedBalance": $informedBalance, "shownBalance": $shownBalance, "reason": "$reason"}"""

    private fun reconcile(wallet: String, body: String) = restTestClient.post()
        .uri("/private/v1/financial/wallets/$wallet/reconciliations")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun assertPosition(reconciliation: String, expected: Int) {
        restTestClient.get()
            .uri("$HISTORY_URL/$reconciliation/position")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.position").isEqualTo(expected)
    }

    private fun assertNothingRecorded(walletId: Long, expectedBalance: String) {
        assertThat(balanceOf(walletId)).isEqualByComparingTo(expectedBalance)
        assertThat(reconciliationsOf(walletId)).isEqualTo(0)
        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isEqualTo(FIXTURE_ENTRIES)
    }

    private fun balanceOf(walletId: Long): BigDecimal =
        dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(walletId)).fetchSingle().value1()!!

    private fun reconciliationsOf(walletId: Long): Int =
        dsl.fetchCount(WALLET_RECONCILIATIONS, WALLET_RECONCILIATIONS.ID_WALLET.eq(walletId))

    private fun entryExternalId(name: String): String =
        dsl.select(WALLET_ENTRIES.EXTERNAL_ID).from(WALLET_ENTRIES).where(WALLET_ENTRIES.NAME.eq(name)).fetchSingle().value1()!!.toString()

    companion object {
        private const val FIXTURE_ENTRIES = 8
        private const val WALLET_ID = 9101L
        private const val INACTIVE_WALLET_ID = 9102L
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val INACTIVE_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a02"
        private const val OTHER_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a05"
        private const val RECONCILIATIONS_URL = "/private/v1/financial/wallets/$WALLET/reconciliations"
        private const val HISTORY_URL = "/private/v1/financial/wallets/$OTHER_WALLET/reconciliations"
        private const val EMERGENCY_COMPARTMENT = "c0a1e9a0-0000-4000-8000-000000009201"
        private const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val NEWEST_RECONCILIATION = "8c4d2f10-3a5b-4e6c-9d7e-1f2a3b4c5d13"
        private const val MIDDLE_RECONCILIATION = "8c4d2f10-3a5b-4e6c-9d7e-1f2a3b4c5d12"
        private const val OLDEST_RECONCILIATION = "8c4d2f10-3a5b-4e6c-9d7e-1f2a3b4c5d11"
        private const val NEWEST_ENTRY = "5d2a6c1e-8b0f-4f5d-9c0e-7a1b2c3d4e13"
    }
}
