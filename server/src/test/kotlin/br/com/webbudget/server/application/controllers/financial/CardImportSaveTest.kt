package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.jooq.financial.tables.references.CARD_PURCHASES
import br.com.webbudget.server.jooq.financial.tables.references.IMPORTS
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_LINES
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_NAME_MEMORIES
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.PAYMENTS
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_LAUNCHES
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_MOVEMENTS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-card-purchases.sql",
    "/sql/financial/create-imports.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class CardImportSaveTest : ImportTestSupport() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should save a card import and leave the invoice with the total of the file`() {

        val id = draft()

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("SAVED")
            .jsonPath("$.savedOn").isNotEmpty
            .jsonPath("$.result.created").isEqualTo(2)
            .jsonPath("$.result.linked").isEqualTo(1)
            .jsonPath("$.result.recurring").isEqualTo(1)
            .jsonPath("$.result.ignored").isEqualTo(3)
            .jsonPath("$.undoBlockers.length()").isEqualTo(0)

        assertThat(invoiceTotal()).isEqualByComparingTo("1590.90")
        assertThat(dsl.fetchCount(CARD_PURCHASES, CARD_PURCHASES.ID_INVOICE.eq(INVOICE))).isEqualTo(6)

        val streaming = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Streaming Exemplo 1/3")).fetchSingle()

        assertThat(streaming.status).isEqualTo("PAID")
        assertThat(streaming.value).isEqualByComparingTo("39.90")
        assertThat(dsl.fetchCount(RECURRING_LAUNCHES, RECURRING_LAUNCHES.ID_RECURRING_MOVEMENT.eq(9203L))).isEqualTo(1)

        val payment = dsl.selectFrom(PAYMENTS).where(PAYMENTS.ID_MOVEMENT.eq(9201L)).fetchSingle()

        assertThat(payment.method).isEqualTo("CARD")
        assertThat(payment.paidOn).isEqualTo(LocalDate.of(2024, 11, 15))
        assertThat(dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID.eq(9201L)).fetchSingle().status).isEqualTo("PAID")

        val purchase = dsl.selectFrom(CARD_PURCHASES).where(CARD_PURCHASES.NAME.eq("Padaria São João & Café")).fetchSingle()

        assertThat(purchase.purchasedOn).isEqualTo(LocalDate.of(2024, 11, 3))
        assertThat(purchase.value).isEqualByComparingTo("125.50")

        val saved = dsl.selectFrom(IMPORT_LINES).where(IMPORT_LINES.ID_IMPORT.eq(importId(id))).orderBy(IMPORT_LINES.POSITION).fetch()

        assertThat(saved[0].idCreatedMovement).isNotNull
        assertThat(saved[1].idCreatedPurchase).isEqualTo(purchase.id)
        assertThat(saved[6].idCreatedMovement).isNull()
        assertThat(saved[6].previousValue).isNull()

        val shown = lines(id)

        assertThat(shown[0]["created"].asList().map { it.asMap()["name"] }).containsExactly("Streaming Exemplo 1/3")
        assertThat(shown[1]["created"].asList().map { it.asMap()["kind"] }).containsExactly("PURCHASE")
        assertThat(shown[6]["created"]).isEqualTo(emptyList<Any>())

        val memory = dsl.selectFrom(IMPORT_NAME_MEMORIES)
            .where(IMPORT_NAME_MEMORIES.NORMALIZED_NAME.eq("celular novo exemplo"))
            .fetchSingle()

        assertThat(memory.action).isEqualTo("LINK")
        assertThat(memory.idRecurringMovement).isEqualTo(9201L)
        assertThat(dsl.selectFrom(IMPORT_NAME_MEMORIES).where(IMPORT_NAME_MEMORIES.NORMALIZED_NAME.eq("padaria sao joao cafe")).fetchSingle().idCostCenter)
            .isEqualTo(9102L)
        assertThat(dsl.fetchCount(IMPORT_NAME_MEMORIES, IMPORT_NAME_MEMORIES.NORMALIZED_NAME.eq("pagamento recebido"))).isEqualTo(0)

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().isConflict("import-not-ready")
        patchLine(id, lines(id)[0], """{"name": "x"}""").isConflict("import-not-editable")

        val next = upload("card-statement.ofx", card = CARD, content = yearOf(2024))

        assertThat(lines(next).map { it["alreadyImported"] }).containsOnly(true)
        assertThat(lines(next).map { it["action"] }).containsOnly("IGNORE")
    }

    @Test
    fun `should save the divergent values, the purchase links and the created recurring and undo everything`() {

        val id = draft()
        val all = lines(id)

        patchLine(id, all[0], """{"action": "LINK", "link": {"kind": "MOVEMENT", "id": "$GYM_MOVEMENT"}}""").expectStatus().isOk
        patchLine(id, all[1], """{"action": "LINK", "link": {"kind": "PURCHASE", "id": "$PIZZA"}}""").expectStatus().isOk
        patchLine(id, all[2], """{"action": "CREATE_RECURRING", "installment": 2, "installments": 4}""").expectStatus().isOk

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        assertThat(dsl.selectFrom(CARD_PURCHASES).where(CARD_PURCHASES.ID.eq(9101L)).fetchSingle().value).isEqualByComparingTo("125.50")
        assertThat(dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID.eq(9204L)).fetchSingle().value).isEqualByComparingTo("39.90")

        val recurring = dsl.selectFrom(RECURRING_MOVEMENTS).where(RECURRING_MOVEMENTS.NAME.eq("Loja Internacional Exemplo")).fetchSingle()

        assertThat(recurring.installments).isEqualTo(4)
        assertThat(recurring.firstInstallment).isEqualTo(2)
        assertThat(recurring.autoLaunch).isTrue()
        assertThat(recurring.idCard).isEqualTo(9101L)

        val launched = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Loja Internacional Exemplo 2/4")).fetchSingle()

        assertThat(launched.status).isEqualTo("PAID")
        assertThat(launched.value).isEqualByComparingTo("100.00")

        val saved = dsl.selectFrom(IMPORT_LINES).where(IMPORT_LINES.ID_IMPORT.eq(importId(id))).orderBy(IMPORT_LINES.POSITION).fetch()

        assertThat(saved[0].previousValue).isEqualByComparingTo("80.00")
        assertThat(saved[1].previousValue).isEqualByComparingTo("80.00")
        assertThat(saved[2].idCreatedRecurring).isEqualTo(recurring.id)

        assertThat(lines(id)[2]["created"].asList().map { it.asMap()["kind"] }).containsExactlyInAnyOrder("MOVEMENT", "RECURRING")

        restTestClient.post().uri("$IMPORTS_URL/$id/undo").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("UNDONE")
            .jsonPath("$.undoneOn").isNotEmpty

        assertThat(dsl.selectFrom(CARD_PURCHASES).where(CARD_PURCHASES.ID.eq(9101L)).fetchSingle().value).isEqualByComparingTo("80.00")
        assertThat(invoiceTotal()).isEqualByComparingTo("125.50")
        assertThat(dsl.fetchCount(CARD_PURCHASES, CARD_PURCHASES.ID_INVOICE.eq(INVOICE))).isEqualTo(2)

        val gym = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.ID.eq(9204L)).fetchSingle()

        assertThat(gym.status).isEqualTo("OPEN")
        assertThat(gym.value).isEqualByComparingTo("80.00")
        assertThat(dsl.fetchCount(PAYMENTS)).isEqualTo(0)
        assertThat(dsl.fetchCount(RECURRING_MOVEMENTS, RECURRING_MOVEMENTS.NAME.eq("Loja Internacional Exemplo"))).isEqualTo(0)
        assertThat(dsl.fetchCount(MOVEMENTS, MOVEMENTS.NAME.like("%Exemplo%/%"))).isEqualTo(1)
        assertThat(dsl.fetchCount(RECURRING_LAUNCHES, RECURRING_LAUNCHES.ID_RECURRING_MOVEMENT.eq(9203L))).isEqualTo(0)

        val undone = dsl.selectFrom(IMPORT_LINES).where(IMPORT_LINES.ID_IMPORT.eq(importId(id))).fetch()

        assertThat(undone.mapNotNull { it.idCreatedMovement }).isEmpty()
        assertThat(undone.mapNotNull { it.previousValue }).isEmpty()

        restTestClient.post().uri("$IMPORTS_URL/$id/undo").exchange().isConflict("import-not-saved")
        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().isConflict("import-not-ready")

        upload("card-statement.ofx", card = CARD, content = yearOf(2024))
    }

    @Test
    fun `should refuse to save an import with pending lines or that is not open anymore`() {

        val id = upload("card-statement.ofx", card = CARD, content = yearOf(2024))

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("import-with-pending-lines")
            .jsonPath("$.parameters.pending").isEqualTo(1)

        completePending(id)

        dsl.update(INVOICES).set(INVOICES.STATUS, "CLOSED").where(INVOICES.ID.eq(INVOICE)).execute()

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().isBadRequest("no-open-invoice")

        dsl.update(INVOICES).set(INVOICES.STATUS, "OPEN").where(INVOICES.ID.eq(INVOICE)).execute()
        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "CLOSED").where(FINANCIAL_PERIODS.ID.eq(9101L)).execute()

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().isBadRequest("financial-period-not-open")

        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "OPEN").where(FINANCIAL_PERIODS.ID.eq(9101L)).execute()
        dsl.update(MOVEMENTS).set(MOVEMENTS.STATUS, "PAID").where(MOVEMENTS.ID.eq(9201L)).execute()

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().isBadRequest("movement-already-paid")

        assertThat(dsl.fetchCount(CARD_PURCHASES)).isEqualTo(3)
        assertThat(dsl.selectFrom(IMPORTS).where(IMPORTS.EXTERNAL_ID.eq(UUID.fromString(id))).fetchSingle().status).isEqualTo("READY")

        restTestClient.post().uri("$IMPORTS_URL/$FAILED_IMPORT/save").exchange().isConflict("import-not-ready")
        restTestClient.post().uri("$IMPORTS_URL/$FAILED_IMPORT/undo").exchange().isConflict("import-not-saved")
        restTestClient.post().uri("$IMPORTS_URL/${UUID.randomUUID()}/save").exchange().isNotFound()
        restTestClient.post().uri("$IMPORTS_URL/${UUID.randomUUID()}/undo").exchange().isNotFound()
        restTestClient.post().uri("$IMPORTS_URL/$SAVED_IMPORT/undo").exchange().isBadRequest("import-target-not-supported")
    }

    @Test
    fun `should refuse to undo and list what prevents it`() {

        val id = draft()

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        dsl.update(INVOICES).set(INVOICES.STATUS, "CLOSED").where(INVOICES.ID.eq(INVOICE)).execute()
        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "CLOSED").where(FINANCIAL_PERIODS.ID.eq(9101L)).execute()

        assertBlockers(id, "financial-period-not-open", "invoice-not-open")

        restTestClient.post().uri("$IMPORTS_URL/$id/undo").exchange()
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("import-undo-blocked")
            .jsonPath("$.parameters.blockers[0].reason").isEqualTo("financial-period-not-open")

        dsl.update(INVOICES).set(INVOICES.STATUS, "OPEN").where(INVOICES.ID.eq(INVOICE)).execute()
        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "OPEN").where(FINANCIAL_PERIODS.ID.eq(9101L)).execute()
        dsl.update(CARD_PURCHASES).set(CARD_PURCHASES.VALUE, BigDecimal("1.00")).where(CARD_PURCHASES.NAME.eq("Padaria São João & Café")).execute()

        assertBlockers(id, "created-purchase-changed")

        dsl.update(CARD_PURCHASES).set(CARD_PURCHASES.VALUE, BigDecimal("125.50")).where(CARD_PURCHASES.NAME.eq("Padaria São João & Café")).execute()
        dsl.deleteFrom(PAYMENTS).where(PAYMENTS.ID_MOVEMENT.eq(9201L)).execute()
        dsl.deleteFrom(PAYMENTS).where(PAYMENTS.ID_MOVEMENT.eq(dsl.select(MOVEMENTS.ID).from(MOVEMENTS).where(MOVEMENTS.NAME.eq("Streaming Exemplo 1/3")))).execute()

        assertBlockers(id, "launched-movement-changed", "linked-entry-changed")
    }

    @Test
    fun `should block the undo when a linked purchase changed or a created purchase was deleted`() {

        val id = draft()

        patchLine(id, lines(id)[1], """{"action": "LINK", "link": {"kind": "PURCHASE", "id": "$PIZZA"}}""").expectStatus().isOk

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        dsl.update(CARD_PURCHASES).set(CARD_PURCHASES.VALUE, BigDecimal("1.00")).where(CARD_PURCHASES.ID.eq(9101L)).execute()
        dsl.deleteFrom(CARD_PURCHASES).where(CARD_PURCHASES.NAME.eq("Loja Internacional Exemplo")).execute()

        assertBlockers(id, "linked-entry-changed", "created-purchase-changed")
    }

    @Test
    fun `should block the undo when the created recurring launched in another period`() {

        val id = draft()

        patchLine(id, lines(id)[2], """{"action": "CREATE_RECURRING", "installment": 2, "installments": 4}""").expectStatus().isOk

        restTestClient.post().uri("$IMPORTS_URL/$id/save").exchange().expectStatus().isOk

        val recurringId = dsl.select(RECURRING_MOVEMENTS.ID).from(RECURRING_MOVEMENTS)
            .where(RECURRING_MOVEMENTS.NAME.eq("Loja Internacional Exemplo")).fetchSingle().value1()!!

        dsl.insertInto(MOVEMENTS)
            .set(MOVEMENTS.EXTERNAL_ID, UUID.randomUUID())
            .set(MOVEMENTS.VERSION, 0)
            .set(MOVEMENTS.CREATED_ON, LocalDateTime.now())
            .set(MOVEMENTS.NAME, "Loja Internacional Exemplo 3/4")
            .set(MOVEMENTS.TYPE, "EXPENSE")
            .set(MOVEMENTS.VALUE, BigDecimal("100.00"))
            .set(MOVEMENTS.DUE_DATE, LocalDate.of(2024, 8, 31))
            .set(MOVEMENTS.STATUS, "OPEN")
            .set(MOVEMENTS.ID_FINANCIAL_PERIOD, 9103L)
            .set(MOVEMENTS.ID_CLASSIFICATION, 9101L)
            .set(MOVEMENTS.ID_COST_CENTER, 9101L)
            .execute()

        val movementId = dsl.select(MOVEMENTS.ID).from(MOVEMENTS).where(MOVEMENTS.NAME.eq("Loja Internacional Exemplo 3/4")).fetchSingle().value1()!!

        dsl.insertInto(RECURRING_LAUNCHES)
            .set(RECURRING_LAUNCHES.EXTERNAL_ID, UUID.randomUUID())
            .set(RECURRING_LAUNCHES.VERSION, 0)
            .set(RECURRING_LAUNCHES.CREATED_ON, LocalDateTime.now())
            .set(RECURRING_LAUNCHES.ID_RECURRING_MOVEMENT, recurringId)
            .set(RECURRING_LAUNCHES.ID_FINANCIAL_PERIOD, 9103L)
            .set(RECURRING_LAUNCHES.INSTALLMENT, 3)
            .set(RECURRING_LAUNCHES.ID_MOVEMENT, movementId)
            .execute()

        assertBlockers(id, "recurring-launched-elsewhere")
    }

    @Suppress("UNCHECKED_CAST")
    private fun Any?.asList(): List<Any?> = this as List<Any?>

    private fun draft(): String {

        val id = upload("card-statement.ofx", card = CARD, content = yearOf(2024))

        completePending(id)

        return id
    }

    private fun completePending(id: String) {
        patchLine(id, lines(id)[2], """{"costCenter": "$HOME_COST_CENTER", "classification": "$EXPENSE_CLASSIFICATION"}""")
            .expectStatus().isOk
    }

    private fun yearOf(year: Int): ByteArray =
        String(resource("card-statement.ofx"), Charsets.UTF_8).replace("2026", year.toString()).toByteArray()

    private fun importId(id: String): Long =
        dsl.select(IMPORTS.ID).from(IMPORTS).where(IMPORTS.EXTERNAL_ID.eq(UUID.fromString(id))).fetchSingle().value1()!!

    private fun invoiceTotal(): BigDecimal = dsl.select(DSL.sum(CARD_PURCHASES.VALUE))
        .from(CARD_PURCHASES)
        .where(CARD_PURCHASES.ID_INVOICE.eq(INVOICE))
        .fetchSingle()
        .value1()!!

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

        restTestClient.post().uri("$IMPORTS_URL/$id/undo").exchange().isConflict("import-undo-blocked")
    }

    companion object {
        private const val INVOICE = 9101L
    }
}
