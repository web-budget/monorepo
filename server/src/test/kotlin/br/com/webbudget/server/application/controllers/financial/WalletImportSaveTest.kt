package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.jooq.financial.tables.references.IMPORTS
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_LINES
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_NAME_MEMORIES
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.PAYMENTS
import br.com.webbudget.server.jooq.financial.tables.references.TRANSFERS
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
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
import java.util.UUID

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-imports.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class WalletImportSaveTest : ImportTestSupport() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should save an account statement and leave the wallet with the balance the draft promised`() {

        val id = upload("account-statement.ofx", wallet = WALLET)

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("SAVED")
            .jsonPath("$.savedOn").isNotEmpty
            .jsonPath("$.undoBlockers.length()").isEqualTo(0)

        assertThat(balance(9101L)).isEqualByComparingTo("1359.85")
        assertThat(balance(9103L)).isEqualByComparingTo("50.25")

        val salary = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID.eq(9202L)).fetchSingle()
        val salaryPayment = dsl.selectFrom(PAYMENTS).where(PAYMENTS.ID_MOVEMENT.eq(9202L)).fetchSingle()

        assertThat(salary.status).isEqualTo("PAID")
        assertThat(salaryPayment.method).isEqualTo("WALLET")
        assertThat(salaryPayment.idWallet).isEqualTo(9101L)
        assertThat(salaryPayment.paidOn).isEqualTo(LocalDate.of(2026, 11, 3))
        assertThat(dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID.eq(9203L)).fetchSingle().status).isEqualTo("PAID")
        assertThat(dsl.selectFrom(INVOICES).where(INVOICES.ID.eq(9102L)).fetchSingle().status).isEqualTo("PAID")

        val created = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("ENERGIA FICTÍCIA S.A.")).fetchSingle()

        assertThat(created.type).isEqualTo("EXPENSE")
        assertThat(created.status).isEqualTo("PAID")
        assertThat(created.value).isEqualByComparingTo("89.90")
        assertThat(created.dueDate).isEqualTo(LocalDate.of(2026, 11, 5))
        assertThat(created.idFinancialPeriod).isEqualTo(9101L)

        val transfer = dsl.selectFrom(TRANSFERS).where(TRANSFERS.VALUE.eq(BigDecimal("50.25"))).fetchSingle()

        assertThat(transfer.idFromWallet).isEqualTo(9101L)
        assertThat(transfer.idToWallet).isEqualTo(9103L)
        assertThat(transfer.description).startsWith("Transferência enviada pelo Pix - MARIA FICTÍCIA DA SILVA")

        val saved = dsl.selectFrom(IMPORT_LINES).where(IMPORT_LINES.ID_IMPORT.eq(importId(id))).orderBy(IMPORT_LINES.POSITION).fetch()

        assertThat(saved[0].idCreatedTransfer).isEqualTo(transfer.id)
        assertThat(saved[3].idCreatedMovement).isEqualTo(created.id)
        assertThat(saved[4].idCreatedTransfer).isNull()
        assertThat(dsl.fetchCount(TRANSFERS)).isEqualTo(3)

        assertThat(
            dsl.selectFrom(IMPORT_NAME_MEMORIES).where(IMPORT_NAME_MEMORIES.NORMALIZED_NAME.eq("empresa ficticia ltda")).fetchSingle().idRecurringMovement
        ).isEqualTo(9202L)
        assertThat(dsl.fetchCount(IMPORT_NAME_MEMORIES, IMPORT_NAME_MEMORIES.NORMALIZED_NAME.eq("ana exemplo"))).isEqualTo(0)
    }

    @Test
    fun `should create the movements by the sign of the line and not duplicate a transfer registered before`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val all = lines(id)

        patchLine(id, all[2], """{"action": "CREATE", "costCenter": "$HOME_COST_CENTER", "classification": "$INCOME_CLASSIFICATION"}""")
            .expectStatus().isOk

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        val income = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("JOÃO EXEMPLO")).fetchSingle()

        assertThat(income.type).isEqualTo("INCOME")
        assertThat(income.value).isEqualByComparingTo("10.10")
        assertThat(balance(9101L)).isEqualByComparingTo("1369.95")
        assertThat(dsl.fetchCount(TRANSFERS)).isEqualTo(3)
    }

    @Test
    fun `should pay the divergent value, undo everything and bring the balances back`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val all = lines(id)

        patchLine(id, all[3], """{"action": "LINK", "link": {"kind": "MOVEMENT", "id": "$GYM_MOVEMENT"}}""").expectStatus().isOk

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        val gym = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID.eq(9204L)).fetchSingle()

        assertThat(gym.status).isEqualTo("PAID")
        assertThat(gym.value).isEqualByComparingTo("89.90")
        assertThat(
            dsl.selectFrom(IMPORT_LINES).where(IMPORT_LINES.ID_IMPORT.eq(importId(id))).and(IMPORT_LINES.POSITION.eq(4)).fetchSingle().previousValue
        ).isEqualByComparingTo("80.00")

        restTestClient.post().uri("$IMPORTS_URL/$id/undo").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("UNDONE")
            .jsonPath("$.undoneOn").isNotEmpty

        assertThat(balance(9101L)).isEqualByComparingTo("0.00")
        assertThat(balance(9103L)).isEqualByComparingTo("0.00")

        val restored = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID.eq(9204L)).fetchSingle()

        assertThat(restored.status).isEqualTo("OPEN")
        assertThat(restored.value).isEqualByComparingTo("80.00")
        assertThat(dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID.eq(9202L)).fetchSingle().status).isEqualTo("OPEN")
        assertThat(dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID.eq(9203L)).fetchSingle().status).isEqualTo("OPEN")
        assertThat(dsl.selectFrom(INVOICES).where(INVOICES.ID.eq(9102L)).fetchSingle().status).isEqualTo("CLOSED")
        assertThat(dsl.fetchCount(MOVEMENTS, MOVEMENTS.NAME.eq("ENERGIA FICTÍCIA S.A."))).isEqualTo(0)
        assertThat(dsl.fetchCount(PAYMENTS)).isEqualTo(0)
        assertThat(dsl.fetchCount(TRANSFERS)).isEqualTo(4)
        assertThat(dsl.selectFrom(IMPORTS).where(IMPORTS.EXTERNAL_ID.eq(UUID.fromString(id))).fetchSingle().status).isEqualTo("UNDONE")
        assertThat(dsl.selectFrom(IMPORT_LINES).where(IMPORT_LINES.ID_IMPORT.eq(importId(id))).fetch().mapNotNull { it.previousValue }).isEmpty()
        assertThat(dsl.fetchCount(WALLET_ENTRIES, WALLET_ENTRIES.ORIGIN.eq("REVERSAL"))).isEqualTo(3)

        upload("account-statement.ofx", wallet = WALLET)
    }

    @Test
    fun `should refuse to save an account statement that is not ready to be saved`() {

        val id = upload("account-statement.ofx", wallet = WALLET)

        patchLine(id, lines(id)[0], """{"action": "CREATE"}""").expectStatus().isOk

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("import-with-pending-lines")
            .jsonPath("$.parameters.pending").isEqualTo(1)

        patchLine(id, lines(id)[0], """{"action": "TRANSFER", "wallet": "$OTHER_WALLET"}""").expectStatus().isOk

        dsl.update(WALLETS).set(WALLETS.ACTIVE, false).where(WALLETS.ID.eq(9101L)).execute()

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().isBadRequest("inactive-wallet")

        assertThat(dsl.fetchCount(TRANSFERS)).isEqualTo(2)
        assertThat(dsl.fetchCount(MOVEMENTS, MOVEMENTS.STATUS.eq("PAID"))).isEqualTo(0)
    }

    @Test
    fun `should refuse to undo and list what prevents it`() {

        val id = upload("account-statement.ofx", wallet = WALLET)

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        val created = dsl.select(MOVEMENTS.EXTERNAL_ID).from(MOVEMENTS).where(MOVEMENTS.NAME.eq("ENERGIA FICTÍCIA S.A.")).fetchSingle().value1()
        val transfer = dsl.select(TRANSFERS.EXTERNAL_ID).from(TRANSFERS).where(TRANSFERS.VALUE.eq(BigDecimal("50.25"))).fetchSingle().value1()

        restTestClient.patch().uri("/private/v1/financial/movements/$created/undo-payment").exchange().expectStatus().isOk
        restTestClient.post().uri("/private/v1/financial/transfers/$transfer/return").exchange().expectStatus().isCreated

        assertBlockers(id, "created-transfer-changed", "created-movement-changed")

        dsl.deleteFrom(PAYMENTS).where(PAYMENTS.ID_MOVEMENT.`in`(9202L, 9203L)).execute()
        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "CLOSED").where(FINANCIAL_PERIODS.ID.eq(9101L)).execute()

        assertBlockers(
            id,
            "financial-period-not-open", "created-transfer-changed", "linked-entry-changed", "created-movement-changed", "linked-entry-changed"
        )

        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "OPEN").where(FINANCIAL_PERIODS.ID.eq(9101L)).execute()
        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "CLOSED").where(FINANCIAL_PERIODS.ID.eq(9103L)).execute()

        assertBlockers(
            id,
            "created-transfer-changed", "linked-entry-changed", "created-movement-changed", "linked-entry-changed"
        )
    }

    @Test
    fun `should block the undo when the period of a linked movement was closed`() {

        val id = upload("account-statement.ofx", wallet = WALLET)

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "CLOSED").where(FINANCIAL_PERIODS.ID.eq(9103L)).execute()

        assertBlockers(id, "linked-period-not-open", "linked-period-not-open")
    }

    private fun balance(walletId: Long): BigDecimal =
        dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(walletId)).fetchSingle().value1()!!

    private fun importId(id: String): Long =
        dsl.select(IMPORTS.ID).from(IMPORTS).where(IMPORTS.EXTERNAL_ID.eq(UUID.fromString(id))).fetchSingle().value1()!!

    private fun assertBlockers(id: String, vararg reasons: String) {

        var blockers: List<Map<String, Any?>> = emptyList()

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                @Suppress("UNCHECKED_CAST")
                blockers = body!!["undoBlockers"] as List<Map<String, Any?>>
            }

        assertThat(blockers.map { it["reason"] }).containsExactly(*reasons)

        restTestClient.post().uri("$IMPORTS_URL/$id/undo").contentType(MediaType.APPLICATION_JSON).exchange().isConflict("import-undo-blocked")
    }
}
