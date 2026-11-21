package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.Payment
import br.com.webbudget.server.domain.services.financial.MovementService
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.PAYMENTS
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
import java.util.concurrent.Callable
import java.util.concurrent.Executors

@Sql("/sql/financial/clear-tables.sql", "/sql/financial/create-registration-data.sql", "/sql/financial/create-movements.sql")
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class MovementControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var movementService: MovementService

    @Autowired
    private lateinit var movementReferenceRepository: MovementReferenceRepository

    @Test
    fun `should require authentication`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should require the financial role`() {

        authenticateWithRoles("REGISTRATION")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should list the movements with the calculated overdue flag`() {

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.content[0].name").isEqualTo("Groceries")
            .jsonPath("$.content[0].overdue").isEqualTo(false)
            .jsonPath("$.content[2].name").isEqualTo("Gym")
            .jsonPath("$.content[2].overdue").isEqualTo(true)
            .jsonPath("$.content[2].financialPeriod.expired").isEqualTo(true)
    }

    @Test
    fun `should filter the movements`() {

        assertTotal("filter=GYM", 1)
        assertTotal("type=INCOME", 1)
        assertTotal("statuses=OPEN", 3)
        assertTotal("statuses=PAID", 0)
        assertTotal("overdue=true", 2)
        assertTotal("overdue=false", 1)
        assertTotal("classification=$EXPENSE_CLASSIFICATION", 2)
        assertTotal("costCenter=$HOME_COST_CENTER", 2)
        assertTotal("financialPeriods=$OPEN_PERIOD", 2)
        assertTotal("financialPeriods=$OPEN_PERIOD&financialPeriods=$CLOSED_PERIOD", 3)
        assertTotal("dueFrom=2024-07-06&dueTo=2024-12-30", 1)
        assertTotal("dueFrom=2024-07-05&dueTo=2024-07-05", 1)
    }

    @Test
    fun `should page and sort the movements`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL?sort=value,desc&page=0&size=1")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("Salary")
            .jsonPath("$.page.totalPages").isEqualTo(3)
    }

    @Test
    fun `should find a movement by id`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$GYM_ID")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Gym")
            .jsonPath("$.type").isEqualTo("EXPENSE")
            .jsonPath("$.value").isEqualTo(320.00)
            .jsonPath("$.status").isEqualTo("OPEN")
            .jsonPath("$.overdue").isEqualTo(true)
            .jsonPath("$.classification.id").isEqualTo(EXPENSE_CLASSIFICATION)
            .jsonPath("$.costCenter.id").isEqualTo(HEALTH_COST_CENTER)
            .jsonPath("$.financialPeriod.id").isEqualTo(OPEN_PERIOD)
            .jsonPath("$.payment").doesNotExist()
    }

    @Test
    fun `should answer not found when the movement does not exist`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should create the movement due today when no due date is given`() {

        createMovement(createBody(name = "Rent")).expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location).matches("http://localhost:[0-9]+/private/v1/financial/movements/[0-9a-f-]{36}")
            }

        val created = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Rent")).fetchSingle()

        assertThat(created.dueDate).isEqualTo(LocalDate.now())
        assertThat(created.status).isEqualTo("OPEN")
        assertThat(created.type).isEqualTo("EXPENSE")
        assertThat(created.version).isEqualTo(0.toShort())
    }

    @Test
    fun `should create the movement with a due date and an income`() {

        createMovement(
            createBody(
                name = "Bonus",
                type = "INCOME",
                classification = INCOME_CLASSIFICATION,
                extra = """, "dueDate": "2099-05-10", "description": "Yearly bonus" """
            )
        ).expectStatus().isCreated

        val created = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Bonus")).fetchSingle()

        assertThat(created.dueDate).isEqualTo(LocalDate.of(2099, 5, 10))
        assertThat(created.description).isEqualTo("Yearly bonus")
    }

    @Test
    fun `should answer unprocessable content when the required fields are missing`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": " ", "value": 0}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.type").isEqualTo("is-null")
            .jsonPath("$.parameters.value").isEqualTo("is-not-positive")
            .jsonPath("$.parameters.financialPeriod").isEqualTo("is-null")
            .jsonPath("$.parameters.classification").isEqualTo("is-null")
            .jsonPath("$.parameters.costCenter").isEqualTo("is-null")
    }

    @Test
    fun `should answer not found when a reference of the movement does not exist`() {

        createMovement(createBody(classification = UUID.randomUUID().toString())).expectStatus().isNotFound
        createMovement(createBody(costCenter = UUID.randomUUID().toString())).expectStatus().isNotFound
        createMovement(createBody(period = UUID.randomUUID().toString())).expectStatus().isNotFound
    }

    @Test
    fun `should answer bad request when the classification has another type`() {

        createMovement(createBody(classification = INCOME_CLASSIFICATION))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("classification-type-mismatch")
    }

    @Test
    fun `should answer bad request when the classification or the cost center is not active`() {

        createMovement(createBody(classification = INACTIVE_CLASSIFICATION))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-classification")

        createMovement(createBody(costCenter = INACTIVE_COST_CENTER))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-cost-center")
    }

    @Test
    fun `should answer bad request when the financial period is closed`() {

        createMovement(createBody(period = CLOSED_PERIOD))
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-not-open")
    }

    @Test
    fun `should create the movement already paid`() {

        createMovement(createBody(name = "Rent", value = "100.00", extra = paymentExtra()))
            .expectStatus().isCreated

        val created = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Rent")).fetchSingle()

        assertThat(created.status).isEqualTo("PAID")
        assertThat(balanceOf(WALLET_DATABASE_ID)).isEqualByComparingTo("-100.00")

        val entry = dsl.selectFrom(WALLET_ENTRIES).where(WALLET_ENTRIES.ID_WALLET.eq(WALLET_DATABASE_ID)).fetchSingle()

        assertThat(entry.direction).isEqualTo("DEBIT")
        assertThat(entry.origin).isEqualTo("EXPENSE")
        assertThat(entry.name).isEqualTo("Rent")
        assertThat(entry.previousBalance).isEqualByComparingTo("0")
        assertThat(entry.resultingBalance).isEqualByComparingTo("-100.00")
        assertThat(entry.idMovement).isEqualTo(created.id)
        assertThat(entry.idFinancialPeriod).isEqualTo(OPEN_PERIOD_DATABASE_ID)
    }

    @Test
    fun `should not create the movement when the payment is invalid`() {

        createMovement(createBody(name = "Rent", extra = paymentExtra(wallet = INACTIVE_WALLET)))
            .expectStatus().isBadRequest

        assertThat(dsl.fetchCount(MOVEMENTS, MOVEMENTS.NAME.eq("Rent"))).isZero()
    }

    @Test
    fun `should update the movement`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$GYM_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody(name = "Gym renamed", extra = """, "dueDate": "2025-01-10" """))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Gym renamed")
            .jsonPath("$.value").isEqualTo(10.5)
            .jsonPath("$.dueDate").isEqualTo("2025-01-10")
            .jsonPath("$.costCenter.id").isEqualTo(HOME_COST_CENTER)

        val updated = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Gym renamed")).fetchSingle()

        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.lastUpdate).isNotNull
    }

    @Test
    fun `should keep the due date when the update does not send one`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$GYM_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody())
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.dueDate").isEqualTo("2024-12-30")
    }

    @Test
    fun `should answer bad request when updating with a classification of another type`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$GYM_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody(classification = INCOME_CLASSIFICATION))
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("classification-type-mismatch")
    }

    @Test
    fun `should answer bad request when updating a movement of a closed period`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/$SALARY_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody(classification = INCOME_CLASSIFICATION))
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-not-open")
    }

    @Test
    fun `should answer not found when updating or deleting an unknown movement`() {

        restTestClient.put()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody())
            .exchange()
            .expectStatus().isNotFound

        restTestClient.delete()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should delete an open movement`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$GYM_ID")
            .exchange()
            .expectStatus().isOk

        assertThat(dsl.fetchCount(MOVEMENTS, MOVEMENTS.EXTERNAL_ID.eq(UUID.fromString(GYM_ID)))).isZero()
    }

    @Test
    fun `should not change nor delete a paid movement`() {

        pay(GYM_ID).expectStatus().isOk

        restTestClient.put()
            .uri("$ENDPOINT_URL/$GYM_ID")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody())
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("movement-already-paid")

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$GYM_ID")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("movement-already-paid")
    }

    @Test
    fun `should pay an expense with a discount and debit the wallet`() {

        pay(GYM_ID, discount = "20.00")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PAID")
            .jsonPath("$.overdue").isEqualTo(false)
            .jsonPath("$.payment.value").isEqualTo(320.00)
            .jsonPath("$.payment.discount").isEqualTo(20.00)
            .jsonPath("$.payment.valuePaid").isEqualTo(300.00)
            .jsonPath("$.payment.wallet.id").isEqualTo(WALLET)
            .jsonPath("$.payment.paidOn").isEqualTo(LocalDate.now().toString())

        assertThat(balanceOf(WALLET_DATABASE_ID)).isEqualByComparingTo("-300.00")
        assertThat(dsl.fetchCount(PAYMENTS)).isEqualTo(1)
    }

    @Test
    fun `should pay an income and credit the wallet even in an expired or past period`() {

        restTestClient.patch()
            .uri("$ENDPOINT_URL/$GROCERIES_ID/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"wallet": "$WALLET", "paidOn": "2024-01-02"}""")
            .exchange()
            .expectStatus().isOk

        createMovement(
            createBody(
                name = "Bonus",
                type = "INCOME",
                value = "500.00",
                classification = INCOME_CLASSIFICATION,
                period = EXPIRED_PERIOD
            )
        ).expectStatus().isCreated

        val bonus = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Bonus")).fetchSingle()

        pay(bonus.externalId.toString()).expectStatus().isOk

        assertThat(balanceOf(WALLET_DATABASE_ID)).isEqualByComparingTo("410.10")

        val entries = dsl.selectFrom(WALLET_ENTRIES).orderBy(WALLET_ENTRIES.ID).fetch()

        assertThat(entries.map { it.direction }).containsExactly("DEBIT", "CREDIT")
        assertThat(entries.map { it.origin }).containsExactly("EXPENSE", "INCOME")
        assertThat(entries[1].previousBalance).isEqualByComparingTo("-89.90")
        assertThat(entries[1].resultingBalance).isEqualByComparingTo("410.10")
    }

    @Test
    fun `should accept a negative balance`() {

        pay(GYM_ID).expectStatus().isOk

        assertThat(balanceOf(WALLET_DATABASE_ID)).isNegative
    }

    @Test
    fun `should answer bad request when the payment is not valid`() {

        pay(GYM_ID, wallet = INACTIVE_WALLET)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-wallet")

        pay(GYM_ID, discount = "320.00")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-discount")

        restTestClient.patch()
            .uri("$ENDPOINT_URL/$GYM_ID/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"wallet": "$WALLET", "paidOn": "${LocalDate.now().plusDays(1)}"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("payment-date-in-future")
    }

    @Test
    fun `should answer unprocessable content when the payment form is not valid`() {

        restTestClient.patch()
            .uri("$ENDPOINT_URL/$GYM_ID/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"discount": -1}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.discount").isEqualTo("is-negative")
    }

    @Test
    fun `should answer not found when paying with an unknown wallet or an unknown movement`() {

        pay(GYM_ID, wallet = UUID.randomUUID().toString()).expectStatus().isNotFound
        pay(UUID.randomUUID().toString()).expectStatus().isNotFound
    }

    @Test
    fun `should answer bad request when paying twice or in a closed period`() {

        pay(GYM_ID).expectStatus().isOk

        pay(GYM_ID)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("movement-already-paid")

        pay(SALARY_ID)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-not-open")

        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isEqualTo(1)
    }

    @Test
    fun `should undo the payment with a reversal and reopen the movement`() {

        pay(GYM_ID, discount = "20.00").expectStatus().isOk

        restTestClient.patch()
            .uri("$ENDPOINT_URL/$GYM_ID/undo-payment")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("OPEN")
            .jsonPath("$.payment").doesNotExist()

        assertThat(balanceOf(WALLET_DATABASE_ID)).isEqualByComparingTo("0")
        assertThat(dsl.fetchCount(PAYMENTS)).isZero()

        val entries = dsl.selectFrom(WALLET_ENTRIES).orderBy(WALLET_ENTRIES.ID).fetch()

        assertThat(entries.map { it.origin }).containsExactly("EXPENSE", "REVERSAL")
        assertThat(entries.map { it.direction }).containsExactly("DEBIT", "CREDIT")
        assertThat(entries[1].value).isEqualByComparingTo("300.00")
        assertThat(entries[1].previousBalance).isEqualByComparingTo("-300.00")
        assertThat(entries[1].resultingBalance).isEqualByComparingTo("0")

        pay(GYM_ID).expectStatus().isOk
    }

    @Test
    fun `should reverse an income by debiting the wallet`() {

        createMovement(
            createBody(name = "Bonus", type = "INCOME", classification = INCOME_CLASSIFICATION, extra = paymentExtra())
        ).expectStatus().isCreated

        val bonus = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Bonus")).fetchSingle()

        undoPayment(bonus.externalId.toString()).expectStatus().isOk

        val entries = dsl.selectFrom(WALLET_ENTRIES).orderBy(WALLET_ENTRIES.ID).fetch()

        assertThat(entries.map { it.direction }).containsExactly("CREDIT", "DEBIT")
        assertThat(balanceOf(WALLET_DATABASE_ID)).isEqualByComparingTo("0")
    }

    @Test
    fun `should answer bad request when undoing a payment that does not exist or in a closed period`() {

        undoPayment(GYM_ID)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("movement-not-paid")

        pay(GYM_ID).expectStatus().isOk
        dsl.update(FINANCIAL_PERIODS).set(FINANCIAL_PERIODS.STATUS, "CLOSED")
            .where(FINANCIAL_PERIODS.ID.eq(OPEN_PERIOD_DATABASE_ID)).execute()

        undoPayment(GYM_ID)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("financial-period-not-open")
    }

    @Test
    fun `should delete a movement whose payment was undone and keep its entries`() {

        pay(GYM_ID).expectStatus().isOk
        undoPayment(GYM_ID).expectStatus().isOk

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$GYM_ID")
            .exchange()
            .expectStatus().isOk

        val entries = dsl.selectFrom(WALLET_ENTRIES).fetch()

        assertThat(entries).hasSize(2)
        assertThat(entries.map { it.idMovement }).containsOnlyNulls()
        assertThat(entries.map { it.name }).containsOnly("Gym")
    }

    @Test
    fun `should not delete a wallet that has entries in its statement`() {

        pay(GYM_ID).expectStatus().isOk

        restTestClient.delete()
            .uri("/private/v1/registration/wallets/$WALLET")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("wallet-has-entries")

        restTestClient.delete()
            .uri("/private/v1/registration/wallets/$OTHER_WALLET")
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `should keep the balance of the wallet consistent with its last entry under concurrent payments`() {

        val classification = movementReferenceRepository.findClassification(UUID.fromString(EXPENSE_CLASSIFICATION))!!
        val costCenter = movementReferenceRepository.findCostCenter(UUID.fromString(HEALTH_COST_CENTER))!!
        val period = movementReferenceRepository.findFinancialPeriod(UUID.fromString(OPEN_PERIOD))!!
        val wallet = movementReferenceRepository.findWallet(UUID.fromString(WALLET))!!

        val movements = (1..8).map { number ->
            val movement = Movement(
                name = "Concurrent $number",
                type = Movement.Type.EXPENSE,
                value = BigDecimal("10.00"),
                dueDate = LocalDate.now(),
                classification = classification,
                costCenter = costCenter,
                financialPeriod = period
            )
            movementService.create(movement)
            movement
        }

        val executor = Executors.newFixedThreadPool(4)

        try {
            executor.invokeAll(
                movements.map { movement ->
                    Callable {
                        movementService.pay(movement, Payment(wallet, LocalDate.now()))
                    }
                }
            ).forEach { it.get() }
        } finally {
            executor.shutdown()
        }

        val entries = dsl.selectFrom(WALLET_ENTRIES).orderBy(WALLET_ENTRIES.ID).fetch()

        assertThat(entries).hasSize(8)
        assertThat(balanceOf(WALLET_DATABASE_ID)).isEqualByComparingTo("-80.00")
        assertThat(entries.last().resultingBalance).isEqualByComparingTo("-80.00")
        entries.zipWithNext().forEach { (previous, next) ->
            assertThat(next.previousBalance).isEqualByComparingTo(previous.resultingBalance)
        }
    }

    @Test
    fun `should report the provisional result of the period with the paid values only`() {

        assertResult(OPEN_PERIOD, "0", "0", "0")

        pay(GYM_ID, discount = "20.00").expectStatus().isOk
        createMovement(
            createBody(
                name = "Bonus",
                type = "INCOME",
                value = "1000.00",
                classification = INCOME_CLASSIFICATION,
                extra = paymentExtra()
            )
        ).expectStatus().isCreated

        assertResult(OPEN_PERIOD, "1000.00", "300.00", "700.00")
        assertResult(EXPIRED_PERIOD, "0", "0", "0")

        undoPayment(GYM_ID).expectStatus().isOk

        assertResult(OPEN_PERIOD, "1000.00", "0", "1000.00")
    }

    @Test
    fun `should answer not found for the result of an unknown period`() {

        restTestClient.get()
            .uri("/private/v1/financial/financial-periods/${UUID.randomUUID()}/result")
            .exchange()
            .expectStatus().isNotFound
    }

    private fun assertResult(period: String, revenues: String, expenses: String, result: String) {
        restTestClient.get()
            .uri("/private/v1/financial/financial-periods/$period/result")
            .exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                assertThat(BigDecimal(body!!["revenues"].toString())).isEqualByComparingTo(revenues)
                assertThat(BigDecimal(body["expenses"].toString())).isEqualByComparingTo(expenses)
                assertThat(BigDecimal(body["result"].toString())).isEqualByComparingTo(result)
            }
    }

    private fun assertTotal(query: String, expected: Int) {
        restTestClient.get()
            .uri("$ENDPOINT_URL?$query")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(expected)
    }

    private fun balanceOf(walletId: Long): BigDecimal =
        dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(walletId)).fetchSingle().value1()!!

    private fun createMovement(body: String) = restTestClient.post()
        .uri(ENDPOINT_URL)
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun pay(movement: String, wallet: String = WALLET, discount: String? = null) = restTestClient.patch()
        .uri("$ENDPOINT_URL/$movement/pay")
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"wallet": "$wallet"${discount?.let { """, "discount": $it""" } ?: ""}}""")
        .exchange()

    private fun undoPayment(movement: String) = restTestClient.patch()
        .uri("$ENDPOINT_URL/$movement/undo-payment")
        .exchange()

    private fun paymentExtra(wallet: String = WALLET) = """, "payment": {"wallet": "$wallet"} """

    private fun createBody(
        name: String = "Movement",
        type: String = "EXPENSE",
        value: String = "10.50",
        classification: String = EXPENSE_CLASSIFICATION,
        costCenter: String = HEALTH_COST_CENTER,
        period: String = OPEN_PERIOD,
        extra: String = ""
    ) = """
        {"name": "$name", "type": "$type", "value": $value, "financialPeriod": "$period",
         "classification": "$classification", "costCenter": "$costCenter"$extra}
    """.trimIndent()

    private fun updateBody(
        name: String = "Movement",
        classification: String = EXPENSE_CLASSIFICATION,
        extra: String = ""
    ) = """
        {"name": "$name", "value": 10.50, "classification": "$classification",
         "costCenter": "$HOME_COST_CENTER"$extra}
    """.trimIndent()

    companion object {
        private const val ENDPOINT_URL = "/private/v1/financial/movements"

        private const val GYM_ID = "4a26f975-c9a9-4231-958c-9b59ee55e04f"
        private const val SALARY_ID = "655a0c7f-caf4-4213-be64-e28c5646e979"
        private const val GROCERIES_ID = "c237997e-c784-429d-9d22-a9f5cc079822"

        private const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val CLOSED_PERIOD = "6531c609-577b-4a45-82a9-debe0b53eeab"
        private const val EXPIRED_PERIOD = "6248abb7-a8ad-4d2b-a0a4-0417b98cb008"
        private const val OPEN_PERIOD_DATABASE_ID = 9101L

        private const val EXPENSE_CLASSIFICATION = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val INCOME_CLASSIFICATION = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
        private const val INACTIVE_CLASSIFICATION = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a03"

        private const val HEALTH_COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val HOME_COST_CENTER = "bfe5413f-1cc6-46cb-967c-8a3b11046747"
        private const val INACTIVE_COST_CENTER = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a04"

        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val INACTIVE_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a02"
        private const val OTHER_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a05"
        private const val WALLET_DATABASE_ID = 9101L
    }
}
