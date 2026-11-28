package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.services.financial.ImportProcessingService
import br.com.webbudget.server.jooq.financial.tables.references.IMPORTS
import br.com.webbudget.server.jooq.financial.tables.references.IMPORT_LINES
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import java.util.UUID

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-invoices.sql",
    "/sql/financial/create-card-purchases.sql",
    "/sql/financial/create-imports.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class ImportControllerTest : ImportTestSupport() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var importProcessingService: ImportProcessingService

    @Test
    fun `should require authentication and the financial role`() {

        authenticateAnonymously()

        restTestClient.get().uri(IMPORTS_URL).exchange().expectStatus().isUnauthorized

        authenticateWithRoles("REGISTRATION")

        restTestClient.get().uri(IMPORTS_URL).exchange().expectStatus().isForbidden
    }

    @Test
    fun `should import a card statement and suggest an action for each line`() {

        val id = upload("card-statement.ofx", card = CARD)

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("READY")
            .jsonPath("$.target").isEqualTo("CARD")
            .jsonPath("$.fileName").isEqualTo("card-statement.ofx")
            .jsonPath("$.fileType").isEqualTo("CREDIT_CARD")
            .jsonPath("$.card.lastFourDigits").isEqualTo("9101")
            .jsonPath("$.startingOn").isEqualTo("2026-11-01")
            .jsonPath("$.ledgerBalance").isEqualTo(-1365.40)
            .jsonPath("$.totals.lines").isEqualTo(7)
            .jsonPath("$.totals.pending").isEqualTo(1)
            .jsonPath("$.totals.ignored").isEqualTo(3)
            .jsonPath("$.totals.byAction.IGNORE").isEqualTo(3)
            .jsonPath("$.result.created").isEqualTo(2)
            .jsonPath("$.result.linked").isEqualTo(1)
            .jsonPath("$.result.recurring").isEqualTo(1)
            .jsonPath("$.result.ignored").isEqualTo(3)
            .jsonPath("$.warnings.fileTotal").isEqualTo(1465.40)
            .jsonPath("$.warnings.afterSave").isEqualTo(1590.90)
            .jsonPath("$.warnings.ignoredCredits").isEqualTo(3.50)
            .jsonPath("$.warnings.unlinkedRecurring.length()").isEqualTo(1)
            .jsonPath("$.warnings.unlinkedRecurring[0].name").isEqualTo("Magazine")
            .jsonPath("$.warnings.unlinkedRecurring[0].recurring").isEqualTo(true)

        val lines = lines(id)

        assertThat(lines.map { it["action"] }).containsExactly(
            "LAUNCH_RECURRING", "CREATE", "CREATE", "IGNORE", "IGNORE", "IGNORE", "LINK"
        )
        assertThat(lines[0]["link"].asMap()["name"]).isEqualTo("Streaming Exemplo")
        assertThat(lines[1]["fromMemory"]).isEqualTo(true)
        assertThat(lines[1]["costCenter"].asMap()["name"]).isEqualTo("Financial test home")
        assertThat(lines[1]["name"]).isEqualTo("Padaria São João & Café")
        assertThat(lines[2]["pending"]).isEqualTo(listOf("cost-center", "classification"))
        assertThat(lines[6]["link"].asMap()["name"]).isEqualTo("Celular Novo Exemplo 10/12")
        assertThat(lines[6]["installment"]).isEqualTo(10)
        assertThat(lines[6]["differentValue"]).isEqualTo(false)
        assertThat(lines[5]["allowedActions"]).isEqualTo(listOf("IGNORE"))
        assertThat(lines[3]["ignoreReason"].asMap()).isEqualTo(mapOf("code" to "iof-pair", "date" to "2026-11-10"))
        assertThat(lines[4]["ignoreReason"].asMap()).isEqualTo(mapOf("code" to "iof-pair", "date" to "2026-11-05"))
        assertThat(lines[5]["ignoreReason"].asMap()).isEqualTo(mapOf("code" to "payment-received"))
        assertThat(lines[6]["ignoreReason"]).isNull()
        assertThat(lines[0]["created"]).isEqualTo(emptyList<Any>())
    }

    @Test
    fun `should import an account statement and suggest an action for each line`() {

        val id = upload("account-statement.ofx", wallet = WALLET)

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("READY")
            .jsonPath("$.fileType").isEqualTo("BANK_ACCOUNT")
            .jsonPath("$.wallet.name").isEqualTo("Financial test wallet")
            .jsonPath("$.totals.pending").isEqualTo(0)
            .jsonPath("$.totals.ignored").isEqualTo(2)
            .jsonPath("$.result.linked").isEqualTo(3)
            .jsonPath("$.result.transfers").isEqualTo(1)
            .jsonPath("$.result.created").isEqualTo(1)
            .jsonPath("$.warnings.ledgerBalance").isEqualTo(1250.01)
            .jsonPath("$.warnings.currentBalance").isEqualTo(0.0)
            .jsonPath("$.warnings.afterSave").isEqualTo(1359.85)
            .jsonPath("$.warnings.unlinkedRecurring.length()").isEqualTo(1)
            .jsonPath("$.warnings.unlinkedRecurring[0].name").isEqualTo("Gym fee")

        val lines = lines(id)

        assertThat(lines.map { it["action"] }).containsExactly(
            "TRANSFER", "LINK", "IGNORE", "CREATE", "LINK", "INVOICE_PAYMENT", "IGNORE"
        )
        assertThat(lines[0]["wallet"].asMap()["name"]).isEqualTo("Financial test other wallet")
        assertThat(lines[1]["link"].asMap()["name"]).isEqualTo("Salary Exemplo")
        assertThat(lines[2]["alreadyRegistered"]).isEqualTo(true)
        assertThat(lines[3]["pending"]).isEqualTo(emptyList<String>())
        assertThat(lines[4]["link"].asMap()["kind"]).isEqualTo("TRANSFER")
        assertThat(lines[4]["alreadyRegistered"]).isEqualTo(true)
        assertThat(lines[5]["link"].asMap()["name"]).isEqualTo("Pagamento de fatura, Financial test card")
        assertThat(lines[6]["alreadyImported"]).isEqualTo(true)
        assertThat(lines[2]["allowedActions"]).isEqualTo(listOf("CREATE", "LINK", "COMPARTMENT", "IGNORE"))
        assertThat(lines[2]["ignoreReason"].asMap()).isEqualTo(mapOf("code" to "already-registered"))
        assertThat(lines[6]["ignoreReason"].asMap()).isEqualTo(mapOf("code" to "already-imported", "date" to "2026-11-01"))
    }

    @Test
    fun `should refuse to start an import that cannot be processed`() {

        attempt("card-statement.ofx", card = CARD, period = CLOSED_PERIOD).isBadRequest("financial-period-not-open")
        attempt("card-statement.ofx", card = CARD, period = OTHER_OPEN_PERIOD).isBadRequest("no-open-invoice")
        attempt("card-statement.ofx", card = OTHER_CARD, period = OTHER_OPEN_PERIOD).isBadRequest("no-open-invoice")
        attempt("account-statement.ofx", wallet = INACTIVE_WALLET).isBadRequest("inactive-wallet")
        attempt("account-statement.ofx").isBadRequest("import-target-required")
        attempt("account-statement.ofx", card = CARD, wallet = WALLET).isBadRequest("import-target-required")
        attempt("account-statement.ofx", wallet = WALLET, period = UUID.randomUUID().toString()).isNotFound()
        attempt("account-statement.ofx", wallet = UUID.randomUUID().toString()).isNotFound()
        attempt("card-statement.ofx", card = UUID.randomUUID().toString()).isNotFound()

        dsl.update(CARDS).set(CARDS.ACTIVE, false).where(CARDS.ID.eq(9102L)).execute()

        attempt("card-statement.ofx", card = OTHER_CARD).isBadRequest("inactive-card")

    }

    @Test
    fun `should allow only one draft for the destination and the period`() {

        val id = upload("account-statement.ofx", wallet = WALLET)

        attempt("account-statement.ofx", wallet = WALLET).isConflict("import-draft-already-exists")

        restTestClient.delete().uri("$IMPORTS_URL/$id").exchange().expectStatus().isOk

        upload("account-statement.ofx", wallet = WALLET)

        upload("account-statement.ofx", wallet = WALLET, period = OTHER_OPEN_PERIOD)
    }

    @Test
    fun `should fail the import with a code for each kind of problem`() {

        assertFailure("account-statement.ofx", "account-statement-on-card", card = CARD)
        assertFailure("card-statement.ofx", "card-statement-on-wallet", wallet = WALLET)
        assertFailure("not-an-ofx.txt", "invalid-ofx-file", wallet = WALLET)
        assertFailure("investment-statement.ofx", "unsupported-ofx-type", wallet = WALLET)
        assertFailure("long-memo.ofx", "import-processing-failed", card = CARD, content = longMemoOfx())

        upload("account-statement.ofx", wallet = WALLET)
    }

    @Test
    fun `should fail when the invoice or the period stopped being open before the processing`() {

        val content = resource("card-statement.ofx")

        dsl.update(INVOICES).set(INVOICES.STATUS, "CLOSED").where(INVOICES.ID.eq(9103L)).execute()

        importProcessingService.process(DRAFT_IMPORT_ID, content)

        assertThat(importStatus(DRAFT_IMPORT_ID)).isEqualTo("FAILED" to "no-open-invoice")

        dsl.update(IMPORTS).set(IMPORTS.STATUS, "PROCESSING").set(IMPORTS.ERROR, null as String?).where(IMPORTS.ID.eq(DRAFT_IMPORT_ID)).execute()
        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "CLOSED").where(FINANCIAL_PERIODS.ID.eq(9101L)).execute()

        importProcessingService.process(DRAFT_IMPORT_ID, content)

        assertThat(importStatus(DRAFT_IMPORT_ID)).isEqualTo("FAILED" to "financial-period-not-open")
    }

    @Test
    fun `should read a statement without lines`() {

        val content = String(resource("account-statement.ofx"), Charsets.ISO_8859_1)
            .replace(Regex("<STMTTRN>.*?</STMTTRN>\\s*", RegexOption.DOT_MATCHES_ALL), "")
            .toByteArray(Charsets.ISO_8859_1)

        val id = upload("empty-statement.ofx", wallet = WALLET, content = content)

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("READY")
            .jsonPath("$.totals.lines").isEqualTo(0)
            .jsonPath("$.totals.pending").isEqualTo(0)
    }

    @Test
    fun `should ignore the processing of an import that does not exist or is not processing`() {

        importProcessingService.process(0, resource("card-statement.ofx"))
        importProcessingService.fail(0, "import-processing-failed")
        importProcessingService.process(SAVED_IMPORT_ID, resource("card-statement.ofx"))

        assertThat(importStatus(SAVED_IMPORT_ID)).isEqualTo("SAVED" to null)
    }

    @Test
    fun `should list and filter the imports`() {

        assertTotal("", 4)
        assertTotal("statuses=READY", 0)
        assertTotal("statuses=FAILED,PROCESSING", 2)
        assertTotal("target=CARD", 2)
        assertTotal("target=WALLET", 2)
        assertTotal("card=$CARD", 1)
        assertTotal("wallet=$WALLET", 1)
        assertTotal("financialPeriod=$OTHER_OPEN_PERIOD", 2)
        assertTotal("filter=BROKEN", 1)
        assertTotal("filter=financial test other card", 1)
        assertTotal("filter=other wallet", 1)

        restTestClient.get().uri("$IMPORTS_URL?size=50").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].fileName").isEqualTo("processing.ofx")
            .jsonPath("$.content[0].status").isEqualTo("PROCESSING")
            .jsonPath("$.content[0].lines").isEqualTo(0)
            .jsonPath("$.content[3].fileName").isEqualTo("previous-statement.ofx")
            .jsonPath("$.content[3].lines").isEqualTo(1)
            .jsonPath("$.content[3].savedOn").isNotEmpty
            .jsonPath("$.content[1].undoneOn").isNotEmpty
            .jsonPath("$.content[2].error").isEqualTo("invalid-ofx-file")
    }

    @Test
    fun `should count the lines and the lines to resolve of each import in the list`() {

        upload("card-statement.ofx", card = CARD)

        restTestClient.get().uri("$IMPORTS_URL?statuses=READY").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].lines").isEqualTo(7)
            .jsonPath("$.content[0].pending").isEqualTo(1)
    }

    @Test
    fun `should count the imports by status`() {

        upload("account-statement.ofx", wallet = WALLET)

        restTestClient.get().uri("$IMPORTS_URL/counts").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.processing").isEqualTo(1)
            .jsonPath("$.ready").isEqualTo(1)
            .jsonPath("$.failed").isEqualTo(1)
            .jsonPath("$.saved").isEqualTo(1)
            .jsonPath("$.undone").isEqualTo(1)
            .jsonPath("$.total").isEqualTo(5)

        restTestClient.get().uri("$IMPORTS_URL/counts?target=WALLET&statuses=READY").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.saved").isEqualTo(1)
            .jsonPath("$.total").isEqualTo(3)
            .jsonPath("$.ready").isEqualTo(1)
            .jsonPath("$.processing").isEqualTo(0)
            .jsonPath("$.failed").isEqualTo(0)
    }

    @Test
    fun `should page the lines with each filter`() {

        val id = upload("card-statement.ofx", card = CARD)

        assertLines(id, "pending=true", 1)
        assertLines(id, "pending=false", 6)
        assertLines(id, "actions=IGNORE", 3)
        assertLines(id, "actions=CREATE,LINK", 3)
        assertLines(id, "filter=padaria", 1)
        assertLines(id, "filter=pagamento recebido", 1)
        assertLines(id, "filter=zzz", 0)

        restTestClient.get().uri("$IMPORTS_URL/$id/lines?sort=value,asc&size=2&page=1").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(7)
            .jsonPath("$.content.length()").isEqualTo(2)
            .jsonPath("$.content[0].value").isEqualTo(-100.0)

        assertThat(lines(id).map { it["position"] }).containsExactly(1, 2, 3, 4, 5, 6, 7)

        restTestClient.get().uri("$IMPORTS_URL/$id/lines?sort=name,desc&size=1").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Streaming Exemplo")
    }

    @Test
    fun `should edit a line and complete what it needs`() {

        val id = upload("card-statement.ofx", card = CARD)
        val pending = lines(id)[2]

        patchLine(id, pending, """{"name": "Loja", "costCenter": "$HOME_COST_CENTER", "classification": "$EXPENSE_CLASSIFICATION"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Loja")
            .jsonPath("$.pending.length()").isEqualTo(0)
            .jsonPath("$.fromMemory").isEqualTo(false)

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totals.pending").isEqualTo(0)
            .jsonPath("$.lastUpdate").isNotEmpty
    }

    @Test
    fun `should link a line to a candidate and show the difference of the value`() {

        val id = upload("card-statement.ofx", card = CARD)
        val line = lines(id)[1]

        val candidates = candidates(id, line, "action" to "LINK")

        assertThat(candidates.map { it["name"] }).containsExactlyInAnyOrder(
            "Gym fee", "Magazine", "Pizza", "Cinema"
        )

        patchLine(id, line, """{"action": "LINK", "link": {"kind": "PURCHASE", "id": "$PIZZA"}}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.action").isEqualTo("LINK")
            .jsonPath("$.link.name").isEqualTo("Pizza")
            .jsonPath("$.differentValue").isEqualTo(true)
            .jsonPath("$.pending.length()").isEqualTo(0)

        assertAfterSave(id, "1510.9")

        patchLine(id, lines(id)[2], """{"action": "LINK"}""").expectStatus().isOk

        assertAfterSave(id, "1410.9")

        patchLine(id, lines(id)[2], """{"action": "LINK", "link": {"kind": "PURCHASE", "id": "$PIZZA"}}""")
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("import-link-not-available")

        patchLine(id, line, """{"action": "CREATE"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.link").doesNotExist()
            .jsonPath("$.differentValue").isEqualTo(false)
    }

    @Test
    fun `should refuse the edits that do not fit the destination or the sign of the line`() {

        val cardId = upload("card-statement.ofx", card = CARD)
        val cardLines = lines(cardId)

        patchLine(cardId, cardLines[5], """{"action": "CREATE"}""").isBadRequest("import-action-not-allowed")
        patchLine(cardId, cardLines[2], """{"action": "INVOICE_PAYMENT"}""").isBadRequest("import-action-not-allowed")
        patchLine(cardId, cardLines[2], """{"classification": "$INCOME_CLASSIFICATION"}""").isBadRequest("classification-type-mismatch")
        patchLine(cardId, cardLines[2], """{"classification": "$INACTIVE_CLASSIFICATION"}""").isBadRequest("inactive-classification")
        patchLine(cardId, cardLines[2], """{"costCenter": "$INACTIVE_COST_CENTER"}""").isBadRequest("inactive-cost-center")
        patchLine(cardId, cardLines[2], """{"classification": "${UUID.randomUUID()}"}""").expectStatus().isNotFound
        patchLine(cardId, cardLines[2], """{"costCenter": "${UUID.randomUUID()}"}""").expectStatus().isNotFound
        patchLine(cardId, cardLines[2], """{"wallet": "${UUID.randomUUID()}"}""").expectStatus().isNotFound
        patchLine(cardId, cardLines[2], """{"wallet": "$OTHER_WALLET"}""").isBadRequest("import-action-not-allowed")
        patchLine(cardId, cardLines[2], """{"action": "CREATE_RECURRING", "installment": 5, "installments": 3}""").isBadRequest("invalid-installments")
        patchLine(cardId, cardLines[2], """{"action": "CREATE_RECURRING", "installment": 2}""").isBadRequest("invalid-installments")
        patchLine(cardId, cardLines[2], """{"name": "${"x".repeat(151)}"}""").expectStatus().isEqualTo(422)
        patchLine(cardId, cardLines[2], """{"link": {"kind": "MOVEMENT"}}""").expectStatus().isEqualTo(422)

        patchLine(cardId, cardLines[2], """{"action": "CREATE_RECURRING", "installment": 2, "installments": 4}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.installments").isEqualTo(4)
            .jsonPath("$.pending.length()").isEqualTo(2)

        val walletId = upload("account-statement.ofx", wallet = WALLET)
        val walletLines = lines(walletId)

        patchLine(walletId, walletLines[1], """{"action": "TRANSFER"}""").isBadRequest("import-action-not-allowed")
        patchLine(walletId, walletLines[1], """{"action": "INVOICE_PAYMENT"}""").isBadRequest("import-action-not-allowed")
        patchLine(walletId, walletLines[0], """{"wallet": "$WALLET"}""").isBadRequest("transfer-between-same-wallet")
        patchLine(walletId, walletLines[0], """{"wallet": "$INACTIVE_WALLET"}""").isBadRequest("inactive-wallet")
        patchLine(walletId, walletLines[1], """{"action": "LINK", "link": {"kind": "TRANSFER", "id": "$OUTGOING_TRANSFER"}}""")
            .isBadRequest("import-link-not-available")
        patchLine(walletId, walletLines[3], """{"action": "LINK", "link": {"kind": "MOVEMENT", "id": "$SALARY_MOVEMENT"}}""")
            .isBadRequest("import-link-not-available")
        patchLine(walletId, walletLines[0], """{"wallet": "$OTHER_WALLET"}""").expectStatus().isOk
    }

    @Test
    fun `should link an income and an outgoing line of the wallet to open movements of any period`() {

        val id = upload("account-statement.ofx", wallet = WALLET)
        val lines = lines(id)

        assertThat(candidates(id, lines[1]).map { it["name"] }).containsExactly("Salary Exemplo")
        assertThat(candidates(id, lines[3], "action" to "LINK").map { it["name"] })
            .containsExactlyInAnyOrder("Celular Novo Exemplo 10/12", "Gym fee", "Magazine")
        assertThat(candidates(id, lines[5]).map { it["name"] }).containsExactly("Pagamento de fatura, Financial test card")
        assertThat(candidates(id, lines[0], "action" to "IGNORE")).isEmpty()

        patchLine(id, lines[3], """{"action": "LINK", "link": {"kind": "MOVEMENT", "id": "$GYM_MOVEMENT"}}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.link.name").isEqualTo("Gym fee")
            .jsonPath("$.differentValue").isEqualTo(true)

        patchLine(id, lines[5], """{"link": {"kind": "MOVEMENT", "id": "$INVOICE_PAYMENT_MOVEMENT"}}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.link.name").isEqualTo("Pagamento de fatura, Financial test card")
    }

    @Test
    fun `should launch a recurring movement of the card from the candidates`() {

        val id = upload("card-statement.ofx", card = CARD)
        val line = lines(id)[1]

        patchLine(id, line, """{"action": "LAUNCH_RECURRING"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.pending[0]").isEqualTo("link")

        assertThat(candidates(id, lines(id)[1])).isEmpty()
        assertThat(candidates(id, lines(id)[0]).map { it["name"] }).containsExactly("Streaming Exemplo")
    }

    @Test
    fun `should apply a batch of changes to many lines at once`() {

        val id = upload("card-statement.ofx", card = CARD)
        val lines = lines(id)

        patchBatch(id, """{"lines": ["${lines[1]["id"]}", "${lines[2]["id"]}"], "action": "CREATE", "costCenter": "$HOME_COST_CENTER", "classification": "$EXPENSE_CLASSIFICATION"}""")
            .expectStatus().isOk

        assertThat(lines(id).map { it["pending"] }.filter { (it as List<*>).isNotEmpty() }).isEmpty()

        patchBatch(id, """{"lines": ["${lines[1]["id"]}", "${lines[5]["id"]}"], "action": "CREATE"}""")
            .isBadRequest("import-action-not-allowed")

        patchBatch(id, """{"lines": []}""").expectStatus().isEqualTo(422)
        patchBatch(id, """{"lines": ["${UUID.randomUUID()}"]}""").expectStatus().isNotFound
    }

    @Test
    fun `should not edit an import that is not a draft`() {

        patchLine(FAILED_IMPORT, mapOf("id" to SAVED_LINE), """{"name": "x"}""").expectStatus().isNotFound

        val id = upload("card-statement.ofx", card = CARD)
        val line = lines(id)[2]

        dsl.update(IMPORTS).set(IMPORTS.STATUS, "SAVED").where(IMPORTS.EXTERNAL_ID.eq(UUID.fromString(id))).execute()

        patchLine(id, line, """{"name": "x"}""").isConflict("import-not-editable")
    }

    @Test
    fun `should discard a draft, a failed import and a processing import but not a saved one`() {

        restTestClient.delete().uri("$IMPORTS_URL/$PROCESSING_IMPORT").exchange().expectStatus().isOk
        restTestClient.delete().uri("$IMPORTS_URL/$FAILED_IMPORT").exchange().expectStatus().isOk
        restTestClient.delete().uri("$IMPORTS_URL/$SAVED_IMPORT").exchange()
            .expectStatus().isEqualTo(409)
            .expectBody().jsonPath("$.error").isEqualTo("import-not-discardable")
        restTestClient.delete().uri("$IMPORTS_URL/$UNDONE_IMPORT").exchange().expectStatus().isEqualTo(409)
        restTestClient.delete().uri("$IMPORTS_URL/${UUID.randomUUID()}").exchange().expectStatus().isNotFound

        val id = upload("card-statement.ofx", card = CARD)

        restTestClient.delete().uri("$IMPORTS_URL/$id").exchange().expectStatus().isOk
        restTestClient.get().uri("$IMPORTS_URL/$id").exchange().expectStatus().isNotFound

        assertThat(dsl.fetchCount(IMPORT_LINES)).isEqualTo(1)
    }

    @Test
    fun `should show the saved import without the warnings of a draft`() {

        restTestClient.get().uri("$IMPORTS_URL/$SAVED_IMPORT").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("SAVED")
            .jsonPath("$.savedOn").isNotEmpty
            .jsonPath("$.totals.lines").isEqualTo(1)
            .jsonPath("$.result.created").isEqualTo(1)
            .jsonPath("$.warnings.unlinkedRecurring.length()").isEqualTo(0)
            .jsonPath("$.warnings.afterSave").isEqualTo(0)
    }

    private fun assertFailure(
        fileName: String,
        error: String,
        card: String? = null,
        wallet: String? = null,
        content: ByteArray = resource(fileName)
    ) {

        val id = upload(fileName, card = card, wallet = wallet, content = content)

        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("FAILED")
            .jsonPath("$.error").isEqualTo(error)
            .jsonPath("$.totals.lines").isEqualTo(0)
    }

    private fun longMemoOfx(): ByteArray = String(resource("card-statement.ofx"), Charsets.UTF_8)
        .replace("Loja Internacional Exemplo", "L".repeat(600))
        .toByteArray()

    private fun importStatus(id: Long): Pair<String, String?> {
        val record = dsl.selectFrom(IMPORTS).where(IMPORTS.ID.eq(id)).fetchSingle()
        return record.status!! to record.error
    }

    private fun assertAfterSave(id: Any, expected: String) {
        restTestClient.get().uri("$IMPORTS_URL/$id").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.warnings.afterSave").isEqualTo(expected.toDouble())
    }

    private fun assertTotal(query: String, expected: Int) {
        restTestClient.get().uri("$IMPORTS_URL?size=50&$query").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(expected)
    }

    private fun assertLines(id: Any, query: String, expected: Int) {
        restTestClient.get().uri("$IMPORTS_URL/$id/lines?size=50&$query").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(expected)
    }
}

private const val SAVED_IMPORT_ID = 9201L
private const val DRAFT_IMPORT_ID = 9204L
