package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.jooq.financial.tables.references.COMPARTMENT_MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.IMPORTS
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_LINES
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_NAME_MEMORIES
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.COMPARTMENTS
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-imports.sql",
    "/sql/financial/create-import-compartments.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class CompartmentImportTest : ImportTestSupport() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should allow the compartment action in every wallet line, in both directions, and never in a card line`() {

        val id = upload("account-statement.ofx", wallet = WALLET)

        lines(id).forEach { line ->
            assertThat(line["allowedActions"] as List<*>).contains("COMPARTMENT")
        }
        assertThat(lines(id).map { (it["value"] as Number).toDouble() }).anyMatch { it > 0 }.anyMatch { it < 0 }

        val cardImport = upload("card-statement.ofx", card = CARD)
        val debit = lines(cardImport).first { (it["value"] as Number).toDouble() < 0 }

        assertThat(debit["allowedActions"] as List<*>).doesNotContain("COMPARTMENT")

        patchLine(cardImport, debit, """{"action": "COMPARTMENT"}""").isBadRequest("import-action-not-allowed")
    }

    @Test
    fun `should leave the line pending without a compartment, clear the classification and list the compartments of the wallet`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val line = lines(id)[3]

        assertThat(line["costCenter"]).isNotNull

        patchLine(id, line, """{"action": "COMPARTMENT"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.action").isEqualTo("COMPARTMENT")
            .jsonPath("$.costCenter").doesNotExist()
            .jsonPath("$.classification").doesNotExist()
            .jsonPath("$.compartment").doesNotExist()
            .jsonPath("$.pending[0]").isEqualTo("compartment")

        val options = candidates(id, line)

        assertThat(options.map { it["name"] }).containsExactly("Emergency", "Property tax")
        assertThat(options.map { it["kind"] }).containsOnly("COMPARTMENT")
        assertThat(options.map { it["id"] }).containsExactly(EMERGENCY, TAX)
        assertThat(BigDecimal(options[0]["value"].toString())).isEqualByComparingTo("1000.00")

        patchLine(id, line, """{"compartment": "$EMERGENCY"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.compartment.id").isEqualTo(EMERGENCY)
            .jsonPath("$.compartment.name").isEqualTo("Emergency")
            .jsonPath("$.compartment.balance").isEqualTo(1000.0)
            .jsonPath("$.pending.length()").isEqualTo(0)

        patchLine(id, line, """{"action": "IGNORE"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.compartment").doesNotExist()
    }

    @Test
    fun `should refuse a compartment of another wallet, an unknown one and a compartment with another action`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val line = lines(id)[3]

        patchLine(id, line, """{"action": "COMPARTMENT", "compartment": "$OTHER_WALLET_COMPARTMENT"}""")
            .expectStatus().isEqualTo(422)
            .expectBody().jsonPath("$.error").isEqualTo("import-compartment-not-available")

        patchLine(id, line, """{"compartment": "${UUID.randomUUID()}"}""").isNotFound()

        patchLine(id, lines(id)[3], """{"action": "CREATE", "compartment": "$EMERGENCY"}""")
            .isBadRequest("import-action-not-allowed")
    }

    @Test
    fun `should accept the compartment action in a batch and keep the lines pending until each gets its compartment`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val all = lines(id)

        patchBatch(id, """{"lines": ["${all[2]["id"]}", "${all[3]["id"]}"], "action": "COMPARTMENT"}""").expectStatus().isOk

        val changed = lines(id)

        assertThat(changed[2]["action"]).isEqualTo("COMPARTMENT")
        assertThat(changed[3]["action"]).isEqualTo("COMPARTMENT")
        assertThat(changed[3]["pending"]).isEqualTo(listOf("compartment"))
        assertThat(changed[3]["costCenter"]).isNull()

        restTestClient.get().uri("$IMPORTS_URL/$id/lines?pending=true&size=50").exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.content[?(@.action == 'COMPARTMENT')].position").isEqualTo(listOf(3, 4))
    }

    @Test
    fun `should count the compartment in the free balance and leave it out of the total after saving`() {

        val id = upload("account-statement.ofx", wallet = WALLET)

        val before = draft(id)

        assertThat(before.compartmentCount).isEqualTo(2)
        assertThat(before.totalAfterSave).isEqualByComparingTo(before.afterSave.add(BigDecimal("1000.00")))

        val line = lines(id)[3]

        patchLine(id, line, """{"action": "COMPARTMENT", "compartment": "$EMERGENCY"}""").expectStatus().isOk

        val after = draft(id)

        assertThat(after.afterSave).isEqualByComparingTo(before.afterSave)
        assertThat(after.totalAfterSave).isEqualByComparingTo(before.totalAfterSave.add(BigDecimal("89.90")))
    }

    @Test
    fun `should have no total after saving in a card import`() {

        val id = upload("card-statement.ofx", card = CARD)

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.warnings.totalAfterSave").doesNotExist()
            .jsonPath("$.wallet").doesNotExist()
    }

    @Test
    fun `should save withdrawing and depositing, record the history and the statement and count the result`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val all = lines(id)

        patchLine(id, all[2], """{"action": "COMPARTMENT", "compartment": "$EMERGENCY"}""").expectStatus().isOk
        patchLine(id, all[3], """{"action": "COMPARTMENT", "compartment": "$EMERGENCY"}""").expectStatus().isOk

        val promised = draft(id).afterSave
        val started = LocalDateTime.now().minusMinutes(1)

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("SAVED")
            .jsonPath("$.result.compartments").isEqualTo(2)
            .jsonPath("$.wallet.compartmentCount").isEqualTo(2)

        assertThat(compartmentBalance(9301L)).isEqualByComparingTo("1079.80")
        assertThat(walletBalance(9101L)).isEqualByComparingTo(promised)

        val movements = dsl.selectFrom(COMPARTMENT_MOVEMENTS).where(COMPARTMENT_MOVEMENTS.ID_COMPARTMENT.eq(9301L))
            .orderBy(COMPARTMENT_MOVEMENTS.ID).fetch()

        assertThat(movements.map { it.direction }).containsExactlyInAnyOrder("WITHDRAWAL", "DEPOSIT")
        assertThat(movements.map { it.value!!.toPlainString() }).containsExactlyInAnyOrder("10.10", "89.90")
        assertThat(movements).allSatisfy { assertThat(it.createdOn).isAfter(started) }
        assertThat(movements).allSatisfy { assertThat(it.note).isNull() }

        val entries = dsl.selectFrom(WALLET_ENTRIES).where(WALLET_ENTRIES.ORIGIN.eq("COMPARTMENT")).fetch()

        assertThat(entries).hasSize(2)
        assertThat(entries.map { it.name }).containsOnly("Emergency")

        val saved = dsl.selectFrom(IMPORT_LINES).where(IMPORT_LINES.ID_IMPORT.eq(importId(id)))
            .and(IMPORT_LINES.ACTION.eq("COMPARTMENT")).orderBy(IMPORT_LINES.POSITION).fetch()

        assertThat(saved.map { it.idCreatedCompartmentMovement }).containsExactlyInAnyOrderElementsOf(movements.map { it.id })
        assertThat(saved.map { it.compartmentName }).containsOnly("Emergency")

        val shown = lines(id).filter { it["action"] == "COMPARTMENT" }

        assertThat(shown).hasSize(2)
        assertThat(shown.map { it["compartmentName"] }).containsOnly("Emergency")
        assertThat(shown.map { it["compartmentMovement"] }).doesNotContainNull()

        restTestClient.get().uri("$IMPORTS_URL/$id/lines?actions=COMPARTMENT").exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.page.totalElements").isEqualTo(2)

        restTestClient.get()
            .uri("/private/v1/financial/wallets/$WALLET/compartments/$EMERGENCY/movements")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.content[0].importId").isEqualTo(id)
            .jsonPath("$.content[1].importId").isEqualTo(id)

        val memories = dsl.selectFrom(IMPORT_NAME_MEMORIES).where(IMPORT_NAME_MEMORIES.ACTION.eq("COMPARTMENT")).fetch()

        assertThat(memories).hasSize(1)
        assertThat(memories.map { it.idCompartment }).containsOnly(9301L)
        assertThat(memories.map { it.normalizedName }).containsOnly("energia ficticia s a")
    }

    @Test
    fun `should show the movement without an import in the history of the compartment`() {

        restTestClient.post()
            .uri("/private/v1/financial/wallets/$WALLET/compartments/$EMERGENCY/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"direction": "DEPOSIT", "value": 10.00}""")
            .exchange()
            .expectStatus().isCreated

        restTestClient.get()
            .uri("/private/v1/financial/wallets/$WALLET/compartments/$EMERGENCY/movements")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].importId").doesNotExist()
    }

    @Test
    fun `should let the free balance go negative when depositing`() {

        dsl.update(WALLETS).set(WALLETS.CURRENT_BALANCE, BigDecimal("-10000.00")).where(WALLETS.ID.eq(9101L)).execute()

        val id = upload("account-statement.ofx", wallet = WALLET)

        patchLine(id, lines(id)[3], """{"action": "COMPARTMENT", "compartment": "$EMERGENCY"}""").expectStatus().isOk

        val promised = draft(id).afterSave

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        assertThat(walletBalance(9101L)).isEqualByComparingTo(promised)
        assertThat(walletBalance(9101L).signum()).isEqualTo(-1)
        assertThat(compartmentBalance(9301L)).isEqualByComparingTo("1089.90")
    }

    @Test
    fun `should accept a withdrawal after a deposit in the same import`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val all = lines(id)

        patchLine(id, all[0], """{"action": "COMPARTMENT", "compartment": "$TAX"}""").expectStatus().isOk
        patchLine(id, all[2], """{"action": "COMPARTMENT", "compartment": "$TAX"}""").expectStatus().isOk

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        assertThat(compartmentBalance(9302L)).isEqualByComparingTo("40.15")
    }

    @Test
    fun `should refuse the withdrawals that together pass the balance, tell the lines and record nothing`() {

        dsl.update(COMPARTMENTS).set(COMPARTMENTS.BALANCE, BigDecimal("3010.00")).where(COMPARTMENTS.ID.eq(9302L)).execute()

        val id = upload("account-statement.ofx", wallet = WALLET)
        val all = lines(id)
        val freeBalance = walletBalance(9101L)

        patchLine(id, all[1], """{"action": "COMPARTMENT", "compartment": "$TAX"}""").expectStatus().isOk
        patchLine(id, all[2], """{"action": "COMPARTMENT", "compartment": "$TAX"}""").expectStatus().isOk

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.error").isEqualTo("import-compartment-balance-exceeded")
            .jsonPath("$.parameters.lines.length()").isEqualTo(1)
            .jsonPath("$.parameters.lines[0].id").isEqualTo(all[2]["id"] as String)
            .jsonPath("$.parameters.lines[0].position").isEqualTo(3)
            .jsonPath("$.parameters.lines[0].postedOn").isEqualTo("2026-11-04")
            .jsonPath("$.parameters.lines[0].compartment").isEqualTo("Property tax")
            .jsonPath("$.parameters.lines[0].balance").isEqualTo(3010.0)

        assertThat(compartmentBalance(9302L)).isEqualByComparingTo("3010.00")
        assertThat(walletBalance(9101L)).isEqualByComparingTo(freeBalance)
        assertThat(dsl.fetchCount(COMPARTMENT_MOVEMENTS)).isEqualTo(0)
        assertThat(dsl.selectFrom(IMPORTS).where(IMPORTS.ID.eq(importId(id))).fetchSingle().status).isEqualTo("READY")
    }

    @Test
    fun `should refuse saving when the chosen compartment moved to another wallet by the time of saving`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val line = lines(id)[3]

        patchLine(id, line, """{"action": "COMPARTMENT", "compartment": "$EMERGENCY"}""").expectStatus().isOk

        dsl.update(COMPARTMENTS).set(COMPARTMENTS.ID_WALLET, 9103L).where(COMPARTMENTS.ID.eq(9301L)).execute()

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange()
            .expectStatus().isEqualTo(422)
            .expectBody().jsonPath("$.error").isEqualTo("import-compartment-not-available")
    }

    @Test
    fun `should refuse saving a line without compartment as pending`() {

        val id = upload("account-statement.ofx", wallet = WALLET)

        patchLine(id, lines(id)[3], """{"action": "COMPARTMENT"}""").expectStatus().isOk

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().isBadRequest("import-with-pending-lines")
    }

    @Test
    fun `should suggest the action and the compartment by the memory, only for a compartment of the wallet of the import`() {

        remember(9301L)

        val id = upload("account-statement.ofx", wallet = WALLET)
        val remembered = lines(id)[0]

        assertThat(remembered["action"]).isEqualTo("COMPARTMENT")
        assertThat(remembered["fromMemory"]).isEqualTo(true)
        assertThat(remembered["compartment"].asMap()["name"]).isEqualTo("Emergency")
        assertThat(remembered["pending"]).isEqualTo(emptyList<String>())

        dsl.deleteFrom(IMPORTS).where(IMPORTS.EXTERNAL_ID.eq(UUID.fromString(id))).execute()
        remember(9303L)

        val other = lines(upload("account-statement.ofx", wallet = WALLET))[0]

        assertThat(other["action"]).isNotEqualTo("COMPARTMENT")
        assertThat(other["compartment"]).isNull()
    }

    @Test
    fun `should not suggest a compartment that was deleted`() {

        remember(9302L)
        dsl.deleteFrom(COMPARTMENTS).where(COMPARTMENTS.ID.eq(9302L)).execute()

        val id = upload("account-statement.ofx", wallet = WALLET)

        assertThat(lines(id)[0]["action"]).isNotEqualTo("COMPARTMENT")
    }

    @Test
    fun `should undo giving back the balances, removing the movements and the statement lines without new ones`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val all = lines(id)
        val freeBefore = walletBalance(9101L)

        patchLine(id, all[2], """{"action": "COMPARTMENT", "compartment": "$EMERGENCY"}""").expectStatus().isOk
        patchLine(id, all[3], """{"action": "COMPARTMENT", "compartment": "$EMERGENCY"}""").expectStatus().isOk
        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.undoBlockers.length()").isEqualTo(0)

        restTestClient.post().uri("$IMPORTS_URL/$id/undo").exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.status").isEqualTo("UNDONE")

        assertThat(compartmentBalance(9301L)).isEqualByComparingTo("1000.00")
        assertThat(walletBalance(9101L)).isEqualByComparingTo(freeBefore)
        assertThat(dsl.fetchCount(COMPARTMENT_MOVEMENTS)).isEqualTo(0)
        assertThat(dsl.fetchCount(WALLET_ENTRIES, WALLET_ENTRIES.ORIGIN.eq("COMPARTMENT"))).isEqualTo(0)

        val undone = dsl.selectFrom(IMPORT_LINES).where(IMPORT_LINES.ID_IMPORT.eq(importId(id)))
            .and(IMPORT_LINES.ACTION.eq("COMPARTMENT")).fetch()

        assertThat(undone.map { it.idCreatedCompartmentMovement }).containsOnlyNulls()
        assertThat(undone.map { it.compartmentName }).containsOnly("Emergency")
    }

    @Test
    fun `should block the undo when the compartment was deleted, would go negative or the wallet is inactive`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val all = lines(id)

        patchLine(id, all[3], """{"action": "COMPARTMENT", "compartment": "$EMERGENCY"}""").expectStatus().isOk
        patchLine(id, all[0], """{"action": "COMPARTMENT", "compartment": "$TAX"}""").expectStatus().isOk
        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        restTestClient.post()
            .uri("/private/v1/financial/wallets/$WALLET/compartments/$EMERGENCY/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"direction": "WITHDRAWAL", "value": 1050.00}""")
            .exchange()
            .expectStatus().isCreated

        dsl.update(COMPARTMENTS).set(COMPARTMENTS.BALANCE, BigDecimal.ZERO).where(COMPARTMENTS.ID.eq(9302L)).execute()
        dsl.deleteFrom(COMPARTMENTS).where(COMPARTMENTS.ID.eq(9302L)).execute()
        dsl.update(WALLETS).set(WALLETS.ACTIVE, false).where(WALLETS.ID.eq(9101L)).execute()

        val blockers = importBlockers(id)

        assertThat(blockers.map { it["reason"] }).contains(
            "created-compartment-deleted",
            "compartment-balance-insufficient",
            "wallet-inactive"
        )
        assertThat(blockers.first { it["reason"] == "created-compartment-deleted" }["compartment"]).isEqualTo("Property tax")

        val negative = blockers.first { it["reason"] == "compartment-balance-insufficient" }

        assertThat(negative["compartment"]).isEqualTo("Emergency")
        assertThat(BigDecimal(negative["value"].toString())).isEqualByComparingTo("-50.00")

        restTestClient.post().uri("$IMPORTS_URL/$id/undo").exchange()
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("import-undo-blocked")
            .jsonPath("$.parameters.blockers[?(@.reason == 'created-compartment-deleted')].compartment").isEqualTo(listOf("Property tax"))
    }

    private fun remember(compartmentId: Long) {
        dsl.update(IMPORT_NAME_MEMORIES)
            .set(IMPORT_NAME_MEMORIES.ACTION, "COMPARTMENT")
            .set(IMPORT_NAME_MEMORIES.ID_WALLET, null as Long?)
            .set(IMPORT_NAME_MEMORIES.ID_COMPARTMENT, compartmentId)
            .where(IMPORT_NAME_MEMORIES.NORMALIZED_NAME.eq("maria ficticia da silva"))
            .execute()
    }

    private fun importBlockers(id: String): List<Map<String, Any?>> {

        var blockers: List<Map<String, Any?>> = emptyList()

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                @Suppress("UNCHECKED_CAST")
                blockers = body!!["undoBlockers"] as List<Map<String, Any?>>
            }

        return blockers
    }

    private fun draft(id: String): Draft {

        var draft: Draft? = null

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                val warnings = body!!["warnings"].asMap()
                draft = Draft(
                    afterSave = BigDecimal(warnings["afterSave"].toString()),
                    totalAfterSave = warnings["totalAfterSave"]?.let { BigDecimal(it.toString()) } ?: BigDecimal.ZERO,
                    compartmentCount = body["wallet"].asMap()["compartmentCount"] as Int
                )
            }

        return draft!!
    }

    private fun walletBalance(walletId: Long): BigDecimal =
        dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(walletId)).fetchSingle().value1()!!

    private fun compartmentBalance(compartmentId: Long): BigDecimal =
        dsl.select(COMPARTMENTS.BALANCE).from(COMPARTMENTS).where(COMPARTMENTS.ID.eq(compartmentId)).fetchSingle().value1()!!

    private fun importId(id: String): Long =
        dsl.select(IMPORTS.ID).from(IMPORTS).where(IMPORTS.EXTERNAL_ID.eq(UUID.fromString(id))).fetchSingle().value1()!!

    private data class Draft(val afterSave: BigDecimal, val totalAfterSave: BigDecimal, val compartmentCount: Int)

    companion object {
        private const val EMERGENCY = "c0a1e9a0-0000-4000-8000-000000009301"
        private const val TAX = "c0a1e9a0-0000-4000-8000-000000009302"
        private const val OTHER_WALLET_COMPARTMENT = "c0a1e9a0-0000-4000-8000-000000009303"
    }
}
