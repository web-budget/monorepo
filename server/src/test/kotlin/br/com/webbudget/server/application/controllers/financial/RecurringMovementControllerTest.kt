package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.CARD_PURCHASES
import br.com.webbudget.server.jooq.financial.tables.references.MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_LAUNCHES
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_MOVEMENTS
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_VALUES
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.time.LocalDate
import java.util.UUID

@Sql("/sql/financial/clear-tables.sql", "/sql/financial/create-registration-data.sql")
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class RecurringMovementControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require authentication and the financial role`() {

        authenticateAnonymously()

        restTestClient.get().uri(ENDPOINT_URL).exchange().expectStatus().isUnauthorized

        authenticateWithRoles("REGISTRATION")

        restTestClient.get().uri(ENDPOINT_URL).exchange().expectStatus().isForbidden
    }

    @Test
    fun `should create a recurring movement with its first value`() {

        create("Streaming", "FIXED", "39.90")
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location).matches("http://localhost:[0-9]+/private/v1/financial/recurring-movements/[0-9a-f-]{36}")
            }

        restTestClient.get().uri("$ENDPOINT_URL/${lastRecurringId()}").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Streaming")
            .jsonPath("$.type").isEqualTo("EXPENSE")
            .jsonPath("$.valueKind").isEqualTo("FIXED")
            .jsonPath("$.value").isEqualTo(39.9)
            .jsonPath("$.suggestedValue").isEqualTo(39.9)
            .jsonPath("$.installments").doesNotExist()
            .jsonPath("$.firstInstallment").isEqualTo(1)
            .jsonPath("$.nextInstallment").isEqualTo(1)
            .jsonPath("$.launchedInstallments").doesNotExist()
            .jsonPath("$.finished").isEqualTo(false)
            .jsonPath("$.active").isEqualTo(true)
            .jsonPath("$.classification.id").isEqualTo(EXPENSE_CLASSIFICATION)
            .jsonPath("$.costCenter.id").isEqualTo(COST_CENTER)

        restTestClient.get().uri("$ENDPOINT_URL/${UUID.randomUUID()}").exchange().expectStatus().isNotFound

        assertThat(dsl.fetchCount(RECURRING_VALUES)).isEqualTo(1)
    }

    @Test
    fun `should refuse an invalid recurring movement`() {

        create("Salary", "FIXED", "10.00", classification = EXPENSE_CLASSIFICATION, type = "INCOME")
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("classification-type-mismatch")

        create("Streaming", "FIXED", "10.00", classification = INACTIVE_CLASSIFICATION)
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("inactive-classification")

        create("Streaming", "FIXED", "10.00", costCenter = INACTIVE_COST_CENTER)
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("inactive-cost-center")

        create("Phone", "FIXED", "10.00", extra = """, "installments": 6, "firstInstallment": 7""")
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("invalid-installments")

        create("Streaming", "FIXED", "10.00", classification = UUID.randomUUID().toString())
            .expectStatus().isNotFound

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": 0, "installments": 0}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")
            .jsonPath("$.parameters.type").isEqualTo("is-null")
            .jsonPath("$.parameters.valueKind").isEqualTo("is-null")
            .jsonPath("$.parameters.autoLaunch").isEqualTo("is-null")
            .jsonPath("$.parameters.value").isEqualTo("is-not-positive")
            .jsonPath("$.parameters.installments").isEqualTo("is-not-positive")

        assertThat(dsl.fetchCount(RECURRING_MOVEMENTS)).isZero()
    }

    @Test
    fun `should update, deactivate and delete a recurring movement without launches`() {

        create("Streaming", "FIXED", "39.90").expectStatus().isCreated
        val id = lastRecurringId()

        restTestClient.put()
            .uri("$ENDPOINT_URL/$id")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody("Streaming plus", active = false, installments = 12))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Streaming plus")
            .jsonPath("$.active").isEqualTo(false)
            .jsonPath("$.installments").isEqualTo(12)
            .jsonPath("$.autoLaunch").isEqualTo(true)

        restTestClient.delete().uri("$ENDPOINT_URL/$id").exchange().expectStatus().isOk

        assertThat(dsl.fetchCount(RECURRING_MOVEMENTS)).isZero()
        assertThat(dsl.fetchCount(RECURRING_VALUES)).isZero()
    }

    @Test
    fun `should keep the history of the values of a fixed recurring movement`() {

        create("Streaming", "FIXED", "39.90").expectStatus().isCreated
        val id = lastRecurringId()

        restTestClient.patch()
            .uri("$ENDPOINT_URL/$id/value")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": 45.90, "reason": "Annual adjustment"}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.value").isEqualTo(45.9)

        restTestClient.get().uri("$ENDPOINT_URL/$id/values").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(2)
            .jsonPath("$.content[0].value").isEqualTo(45.9)
            .jsonPath("$.content[0].reason").isEqualTo("Annual adjustment")
            .jsonPath("$.content[1].value").isEqualTo(39.9)
            .jsonPath("$.content[1].reason").isEqualTo("Valor inicial")
            .jsonPath("$.content[0].current").isEqualTo(true)
            .jsonPath("$.content[1].current").isEqualTo(false)
            .jsonPath("$.content[0].validFromPeriod").doesNotExist()

        restTestClient.patch()
            .uri("$ENDPOINT_URL/$id/value")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": 0}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody().jsonPath("$.parameters.value").isEqualTo("is-not-positive")
    }

    @Test
    fun `should tell the period each value started to apply`() {

        create("Streaming", "FIXED", "39.90").expectStatus().isCreated
        val id = lastRecurringId()

        changeValue(id, "45.90")
        launch(OPEN_PERIOD, id).expectStatus().isOk
        changeValue(id, "50.00")
        launch(OTHER_OPEN_PERIOD, id).expectStatus().isOk
        changeValue(id, "55.00")

        restTestClient.get().uri("$ENDPOINT_URL/$id/values").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].value").isEqualTo(55.0)
            .jsonPath("$.content[0].current").isEqualTo(true)
            .jsonPath("$.content[0].validFromPeriod").doesNotExist()
            .jsonPath("$.content[1].value").isEqualTo(50.0)
            .jsonPath("$.content[1].validFromPeriod.id").isEqualTo(OTHER_OPEN_PERIOD)
            .jsonPath("$.content[1].validFromPeriod.name").isEqualTo("Financial test 08/2024")
            .jsonPath("$.content[1].validFromPeriod.startingAt").isEqualTo("2024-08-01")
            .jsonPath("$.content[2].value").isEqualTo(45.9)
            .jsonPath("$.content[2].validFromPeriod.id").isEqualTo(OPEN_PERIOD)
            .jsonPath("$.content[2].validFromPeriod.startingAt").isEqualTo("2024-12-01")
            .jsonPath("$.content[3].value").isEqualTo(39.9)
            .jsonPath("$.content[3].reason").isEqualTo("Valor inicial")
            .jsonPath("$.content[3].validFromPeriod").doesNotExist()
    }

    @Test
    fun `should list the values launched in each period of a recurring movement`() {

        create("Electricity", "VARIABLE", "150.00").expectStatus().isCreated
        val id = lastRecurringId()

        launch(OTHER_OPEN_PERIOD, id, value = "98.40").expectStatus().isOk
        launch(OPEN_PERIOD, id, value = "120.10").expectStatus().isOk

        val paid = dsl.select(MOVEMENTS.EXTERNAL_ID).from(MOVEMENTS).where(MOVEMENTS.VALUE.eq(java.math.BigDecimal("120.10"))).fetchSingle().value1()

        restTestClient.patch()
            .uri("/private/v1/financial/movements/$paid/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"wallet": "$WALLET", "discount": 20.10}""")
            .exchange()
            .expectStatus().isOk

        restTestClient.get().uri("$ENDPOINT_URL/$id/launches").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(2)
            .jsonPath("$.content[0].financialPeriod.id").isEqualTo(OPEN_PERIOD)
            .jsonPath("$.content[0].financialPeriod.name").isEqualTo("Financial test 12/2024")
            .jsonPath("$.content[0].installment").isEqualTo(2)
            .jsonPath("$.content[0].movement").isEqualTo(paid.toString())
            .jsonPath("$.content[0].value").isEqualTo(120.1)
            .jsonPath("$.content[0].status").isEqualTo("PAID")
            .jsonPath("$.content[0].valuePaid").isEqualTo(100.0)
            .jsonPath("$.content[1].financialPeriod.id").isEqualTo(OTHER_OPEN_PERIOD)
            .jsonPath("$.content[1].installment").isEqualTo(1)
            .jsonPath("$.content[1].value").isEqualTo(98.4)
            .jsonPath("$.content[1].status").isEqualTo("OPEN")
            .jsonPath("$.content[1].valuePaid").doesNotExist()

        restTestClient.get().uri("$ENDPOINT_URL/${UUID.randomUUID()}/launches").exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should apply a new value only from the next launch`() {

        create("Streaming", "FIXED", "39.90").expectStatus().isCreated
        val id = lastRecurringId()

        launch(OPEN_PERIOD, id).expectStatus().isOk

        restTestClient.patch()
            .uri("$ENDPOINT_URL/$id/value")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": 50.00}""")
            .exchange()
            .expectStatus().isOk

        launch(OTHER_OPEN_PERIOD, id).expectStatus().isOk

        assertThat(movementValues()).containsExactlyInAnyOrder("39.90", "50.00")
    }

    @Test
    fun `should launch open movements due on the last day of the period with the installment in the name`() {

        create("Phone", "FIXED", "249.90", extra = """, "installments": 3""").expectStatus().isCreated
        val id = lastRecurringId()

        launch(OPEN_PERIOD, id)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.launched.length()").isEqualTo(1)
            .jsonPath("$.launched[0].installment").isEqualTo(1)
            .jsonPath("$.launched[0].movement.name").isEqualTo("Phone 1/3")
            .jsonPath("$.launched[0].movement.status").isEqualTo("OPEN")
            .jsonPath("$.launched[0].movement.dueDate").isEqualTo("2024-12-31")
            .jsonPath("$.launched[0].movement.value").isEqualTo(249.9)
            .jsonPath("$.skipped.length()").isEqualTo(0)

        val movement = dsl.selectFrom(MOVEMENTS).fetchSingle()

        assertThat(movement.status).isEqualTo("OPEN")
        assertThat(movement.dueDate).isEqualTo(LocalDate.of(2024, 12, 31))
        assertThat(dsl.fetchCount(RECURRING_LAUNCHES)).isEqualTo(1)

        restTestClient.get().uri("$ENDPOINT_URL/$id").exchange()
            .expectBody()
            .jsonPath("$.launchedInstallments").isEqualTo(1)
            .jsonPath("$.nextInstallment").isEqualTo(2)
            .jsonPath("$.finished").isEqualTo(false)

        restTestClient.get().uri("/private/v1/financial/movements/${movement.externalId}").exchange()
            .expectBody()
            .jsonPath("$.recurringMovement.id").isEqualTo(id)
            .jsonPath("$.recurringMovement.card").doesNotExist()
    }

    @Test
    fun `should finish the recurring movement after the last installment and skip it`() {

        create("Phone", "FIXED", "100.00", extra = """, "installments": 2, "firstInstallment": 2""").expectStatus().isCreated
        val id = lastRecurringId()

        launch(OPEN_PERIOD, id)
            .expectBody()
            .jsonPath("$.launched[0].movement.name").isEqualTo("Phone 2/2")

        restTestClient.get().uri("$ENDPOINT_URL/$id").exchange()
            .expectBody()
            .jsonPath("$.finished").isEqualTo(true)
            .jsonPath("$.nextInstallment").doesNotExist()

        launch(OTHER_OPEN_PERIOD, id)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.launched.length()").isEqualTo(0)
            .jsonPath("$.skipped[0].reason").isEqualTo("finished")
            .jsonPath("$.skipped[0].name").isEqualTo("Phone")
    }

    @Test
    fun `should launch the installments in sequence and keep the number when the last launch is deleted`() {

        create("Phone", "FIXED", "100.00", extra = """, "installments": 12""").expectStatus().isCreated
        val id = lastRecurringId()

        launch(OPEN_PERIOD, id).expectStatus().isOk
        launch(OTHER_OPEN_PERIOD, id)
            .expectBody()
            .jsonPath("$.launched[0].movement.name").isEqualTo("Phone 2/12")

        val last = dsl.selectFrom(MOVEMENTS).where(MOVEMENTS.NAME.eq("Phone 2/12")).fetchSingle().externalId

        restTestClient.delete().uri("/private/v1/financial/movements/$last").exchange().expectStatus().isOk

        assertThat(dsl.fetchCount(RECURRING_LAUNCHES)).isEqualTo(1)

        launch(OTHER_OPEN_PERIOD, id)
            .expectBody()
            .jsonPath("$.launched[0].movement.name").isEqualTo("Phone 2/12")
    }

    @Test
    fun `should not launch twice in the same period nor an inactive recurring movement`() {

        create("Streaming", "FIXED", "39.90").expectStatus().isCreated
        val streaming = lastRecurringId()
        create("Gym", "FIXED", "120.00").expectStatus().isCreated
        val gym = lastRecurringId()

        restTestClient.put()
            .uri("$ENDPOINT_URL/$gym")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody("Gym", active = false))
            .exchange()
            .expectStatus().isOk

        launch(OPEN_PERIOD, streaming).expectStatus().isOk

        launch(OPEN_PERIOD, streaming, gym)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.launched.length()").isEqualTo(0)
            .jsonPath("$.skipped[0].reason").isEqualTo("already-launched-in-period")
            .jsonPath("$.skipped[1].reason").isEqualTo("inactive")

        assertThat(dsl.fetchCount(MOVEMENTS)).isEqualTo(1)
    }

    @Test
    fun `should launch the ones that can in a mixed batch`() {

        create("Streaming", "FIXED", "39.90").expectStatus().isCreated
        val streaming = lastRecurringId()
        create("Salary", "FIXED", "8000.00", type = "INCOME", classification = INCOME_CLASSIFICATION)
            .expectStatus().isCreated
        val salary = lastRecurringId()

        launch(OPEN_PERIOD, streaming, salary)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.launched.length()").isEqualTo(2)
            .jsonPath("$.launched[1].movement.type").isEqualTo("INCOME")
    }

    @Test
    fun `should refuse to launch in a closed period or with unknown ids`() {

        create("Streaming", "FIXED", "39.90").expectStatus().isCreated
        val streaming = lastRecurringId()

        launch(CLOSED_PERIOD, streaming)
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("financial-period-not-open")

        launch(UUID.randomUUID().toString(), streaming).expectStatus().isNotFound
        launch(OPEN_PERIOD, UUID.randomUUID().toString()).expectStatus().isNotFound

        restTestClient.post()
            .uri("$ENDPOINT_URL/launch")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"recurringMovements": []}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.financialPeriod").isEqualTo("is-null")
            .jsonPath("$.parameters.recurringMovements").isEqualTo("is-empty")

        assertThat(dsl.fetchCount(MOVEMENTS)).isZero()
    }

    @Test
    fun `should refuse a value for a fixed recurring movement in the batch`() {

        create("Streaming", "FIXED", "39.90").expectStatus().isCreated

        launch(OPEN_PERIOD, lastRecurringId(), value = "10.00")
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("launch-value-only-for-variable")
    }

    @Test
    fun `should suggest the last paid value of a variable recurring movement`() {

        create("Electricity", "VARIABLE", "100.00").expectStatus().isCreated
        val id = lastRecurringId()

        launch(OPEN_PERIOD, id).expectBody().jsonPath("$.launched[0].movement.value").isEqualTo(100.0)

        val first = dsl.selectFrom(MOVEMENTS).fetchSingle().externalId

        restTestClient.put()
            .uri("/private/v1/financial/movements/$first")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """{"name": "Electricity", "value": 130.55, "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$COST_CENTER"}"""
            )
            .exchange()
            .expectStatus().isOk

        restTestClient.patch()
            .uri("/private/v1/financial/movements/$first/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"wallet": "$WALLET"}""")
            .exchange()
            .expectStatus().isOk

        restTestClient.get().uri("$ENDPOINT_URL/$id").exchange()
            .expectBody()
            .jsonPath("$.value").isEqualTo(100.0)
            .jsonPath("$.suggestedValue").isEqualTo(130.55)

        launch(OTHER_OPEN_PERIOD, id).expectBody().jsonPath("$.launched[0].movement.value").isEqualTo(130.55)
    }

    @Test
    fun `should take the value of a variable recurring movement from the batch`() {

        create("Electricity", "VARIABLE", "100.00").expectStatus().isCreated

        launch(OPEN_PERIOD, lastRecurringId(), value = "87.30")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.launched[0].movement.value").isEqualTo(87.3)
    }

    @Test
    fun `should not delete a recurring movement that has launches but allow it after the launch is deleted`() {

        create("Streaming", "FIXED", "39.90").expectStatus().isCreated
        val id = lastRecurringId()

        launch(OPEN_PERIOD, id).expectStatus().isOk

        restTestClient.delete().uri("$ENDPOINT_URL/$id").exchange()
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("recurring-movement-with-launches")

        val movement = dsl.selectFrom(MOVEMENTS).fetchSingle().externalId
        restTestClient.delete().uri("/private/v1/financial/movements/$movement").exchange().expectStatus().isOk

        restTestClient.delete().uri("$ENDPOINT_URL/$id").exchange().expectStatus().isOk
    }

    @Test
    fun `should not reduce the installments below the ones already launched`() {

        create("Phone", "FIXED", "100.00", extra = """, "installments": 6""").expectStatus().isCreated
        val id = lastRecurringId()

        launch(OPEN_PERIOD, id).expectStatus().isOk
        launch(OTHER_OPEN_PERIOD, id).expectStatus().isOk

        restTestClient.put()
            .uri("$ENDPOINT_URL/$id")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody("Phone", installments = 1))
            .exchange()
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("invalid-installments")
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-recurring-movements.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should list and filter the recurring movements`() {

        assertNames("", "Salary", "Phone", "Electricity", "Streaming")
        assertNames("filter=stream", "Streaming")
        assertNames("filter=health", "Salary", "Phone", "Streaming")
        assertNames("type=INCOME", "Salary")
        assertNames("valueKinds=VARIABLE", "Electricity")
        assertNames("valueKinds=FIXED,VARIABLE", "Salary", "Phone", "Electricity", "Streaming")
        assertNames("active=false", "Salary")
        assertNames("active=true&finished=false", "Phone", "Electricity", "Streaming")
        assertNames("finished=true")
        assertNames("ended=true", "Salary")
        assertNames("ended=false", "Phone", "Electricity", "Streaming")
        assertNames("sort=valueKind,asc", "Salary", "Phone", "Streaming", "Electricity")
        assertNames("sort=valueKind,desc", "Electricity", "Salary", "Phone", "Streaming")
        assertNames("sort=name,asc", "Electricity", "Phone", "Salary", "Streaming")
        assertNames("sort=value,desc", "Salary", "Phone", "Electricity", "Streaming")
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-recurring-movements.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should tell which recurring movements were launched for a period and which ones finished`() {

        val phone = "a1c0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c03"

        launch(OPEN_PERIOD, phone).expectStatus().isOk

        restTestClient.get().uri("$ENDPOINT_URL?size=50&financialPeriod=$OPEN_PERIOD").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[?(@.name == 'Phone')].launchedInPeriod").isNotEmpty
            .jsonPath("$.content[?(@.name == 'Streaming')].launchedInPeriod").value<List<Any?>> { assertThat(it).containsExactly(null) }
            .jsonPath("$.content[?(@.name == 'Salary')].ended").isEqualTo(true)
            .jsonPath("$.content[?(@.name == 'Streaming')].ended").isEqualTo(false)

        dsl.update(RECURRING_MOVEMENTS)
            .set(RECURRING_MOVEMENTS.INSTALLMENTS, 1)
            .where(RECURRING_MOVEMENTS.EXTERNAL_ID.eq(UUID.fromString(phone)))
            .execute()

        assertNames("finished=true", "Phone")
        assertNames("ended=true", "Salary", "Phone")
        assertNames("ended=false", "Electricity", "Streaming")
        assertNames("finished=false", "Salary", "Electricity", "Streaming")
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-recurring-movements.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should page the recurring movements`() {

        restTestClient.get().uri("$ENDPOINT_URL?size=3&page=1").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.page.totalElements").isEqualTo(4)
            .jsonPath("$.page.totalPages").isEqualTo(2)
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-invoices.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should suggest a card for an expense and filter by it`() {

        create("Life insurance", "FIXED", "59.90", extra = """, "card": "$CARD"""").expectStatus().isCreated
        val insurance = lastRecurringId()
        create("Streaming", "FIXED", "39.90").expectStatus().isCreated

        restTestClient.get().uri("$ENDPOINT_URL/$insurance").exchange()
            .expectBody()
            .jsonPath("$.card.id").isEqualTo(CARD)
            .jsonPath("$.card.name").isEqualTo("Financial test card")

        assertNames("cards=$CARD", "Life insurance")
        assertNames("cards=$OTHER_CARD")

        restTestClient.put()
            .uri("$ENDPOINT_URL/$insurance")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody("Life insurance", extra = """, "card": "$OTHER_CARD""""))
            .exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.card.id").isEqualTo(OTHER_CARD)

        restTestClient.put()
            .uri("$ENDPOINT_URL/$insurance")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody("Life insurance"))
            .exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.card").doesNotExist()
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-invoices.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should answer not found for unknown references and let an inactive one keep its inactive card`() {

        create("Life insurance", "FIXED", "59.90", extra = """, "card": "$CARD"""").expectStatus().isCreated
        val id = lastRecurringId()

        create("Streaming", "FIXED", "39.90", costCenter = UUID.randomUUID().toString()).expectStatus().isNotFound

        val unknown = UUID.randomUUID()

        listOf(
            """{"name": "A", "active": true, "autoLaunch": true, "classification": "$unknown", "costCenter": "$COST_CENTER"}""",
            """{"name": "A", "active": true, "autoLaunch": true, "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$unknown"}""",
            """{"name": "A", "active": true, "autoLaunch": true, "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$COST_CENTER", "card": "$unknown"}"""
        ).forEach { body ->
            restTestClient.put()
                .uri("$ENDPOINT_URL/$id")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus().isNotFound
        }

        dsl.update(CARDS).set(CARDS.ACTIVE, false).where(CARDS.ID.eq(9101L)).execute()

        restTestClient.put()
            .uri("$ENDPOINT_URL/$id")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody("Life insurance", active = false, extra = """, "card": "$CARD""""))
            .exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.active").isEqualTo(false)

        restTestClient.put()
            .uri("$ENDPOINT_URL/$id")
            .contentType(MediaType.APPLICATION_JSON)
            .body(updateBody("Life insurance", extra = """, "card": "$CARD""""))
            .exchange()
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("inactive-card")
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-invoices.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should refuse a card for an income, an inactive card and an unknown card`() {

        create("Salary", "FIXED", "100.00", type = "INCOME", classification = INCOME_CLASSIFICATION, extra = """, "card": "$CARD"""")
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("card-recurring-must-be-expense")

        dsl.update(CARDS).set(CARDS.ACTIVE, false).where(CARDS.ID.eq(9102L)).execute()

        create("Life insurance", "FIXED", "59.90", extra = """, "card": "$OTHER_CARD"""")
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("inactive-card")

        create("Life insurance", "FIXED", "59.90", extra = """, "card": "${UUID.randomUUID()}"""")
            .expectStatus().isNotFound

        assertThat(dsl.fetchCount(RECURRING_MOVEMENTS)).isZero()
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-invoices.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should pay the launched installment by card into the invoice of the period of the movement`() {

        create("Phone", "FIXED", "249.90", extra = """, "installments": 3, "card": "$CARD"""").expectStatus().isCreated
        val id = lastRecurringId()

        launch(OPEN_PERIOD, id).expectStatus().isOk

        val movement = dsl.selectFrom(MOVEMENTS).fetchSingle().externalId

        restTestClient.get().uri("/private/v1/financial/movements/$movement").exchange()
            .expectBody()
            .jsonPath("$.recurringMovement.id").isEqualTo(id)
            .jsonPath("$.recurringMovement.name").isEqualTo("Phone")
            .jsonPath("$.recurringMovement.card.id").isEqualTo(CARD)

        restTestClient.patch()
            .uri("/private/v1/financial/movements/$movement/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"card": "$CARD"}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("PAID")
            .jsonPath("$.payment.card.id").isEqualTo(CARD)

        val purchase = dsl.selectFrom(CARD_PURCHASES).where(CARD_PURCHASES.NAME.eq("Phone 1/3")).fetchSingle()

        assertThat(purchase.value).isEqualByComparingTo("249.90")
        assertThat(purchase.idInvoice).isEqualTo(9101L)

        restTestClient.get().uri("/private/v1/financial/card-purchases").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[?(@.name == 'Phone 1/3')].recurringMovement.id").isEqualTo(listOf(id))
            .jsonPath("$.content[?(@.name == 'Phone 1/3')].recurringMovement.installment").isEqualTo(listOf(1))
            .jsonPath("$.content[?(@.name == 'Phone 1/3')].recurringMovement.installments").isEqualTo(listOf(3))

        restTestClient.get().uri("/private/v1/financial/card-purchases/${purchase.externalId}").exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.recurringMovement.name").isEqualTo("Phone")
            .jsonPath("$.recurringMovement.installment").isEqualTo(1)
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-invoices.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should refuse to pay the installment by card without an open invoice and keep it open`() {

        create("Phone", "FIXED", "249.90", extra = """, "installments": 3, "card": "$CARD"""").expectStatus().isCreated

        launch(OTHER_OPEN_PERIOD, lastRecurringId()).expectStatus().isOk

        val movement = dsl.selectFrom(MOVEMENTS).fetchSingle().externalId

        restTestClient.patch()
            .uri("/private/v1/financial/movements/$movement/pay")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"card": "$CARD"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody().jsonPath("$.error").isEqualTo("no-open-invoice")

        assertThat(dsl.selectFrom(MOVEMENTS).fetchSingle().status).isEqualTo("OPEN")
        assertThat(dsl.fetchCount(CARD_PURCHASES)).isZero()
    }

    private fun create(
        name: String,
        valueKind: String,
        value: String,
        type: String = "EXPENSE",
        classification: String = EXPENSE_CLASSIFICATION,
        costCenter: String = COST_CENTER,
        extra: String = ""
    ) = restTestClient.post()
        .uri(ENDPOINT_URL)
        .contentType(MediaType.APPLICATION_JSON)
        .body(
            """
            {"name": "$name", "type": "$type", "valueKind": "$valueKind", "value": $value, "autoLaunch": true,
             "classification": "$classification", "costCenter": "$costCenter"$extra}
            """.trimIndent()
        )
        .exchange()

    private fun updateBody(name: String, active: Boolean = true, installments: Int? = null, extra: String = "") = """
        {"name": "$name", "active": $active, "autoLaunch": true, "installments": ${installments ?: "null"},
         "classification": "$EXPENSE_CLASSIFICATION", "costCenter": "$COST_CENTER"$extra}
    """.trimIndent()

    private fun launch(period: String, vararg recurringMovements: String, value: String? = null): ResponseSpec {

        val items = recurringMovements.joinToString(",") { id ->
            if (value == null) """{"id": "$id"}""" else """{"id": "$id", "value": $value}"""
        }

        return restTestClient.post()
            .uri("$ENDPOINT_URL/launch")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"financialPeriod": "$period", "recurringMovements": [$items]}""")
            .exchange()
    }

    private fun changeValue(id: String, value: String) {
        restTestClient.patch()
            .uri("$ENDPOINT_URL/$id/value")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": $value}""")
            .exchange()
            .expectStatus().isOk
    }

    private fun lastRecurringId(): String = dsl.select(RECURRING_MOVEMENTS.EXTERNAL_ID)
        .from(RECURRING_MOVEMENTS)
        .orderBy(RECURRING_MOVEMENTS.ID.desc())
        .limit(1)
        .fetchSingle()
        .value1()
        .toString()

    private fun movementValues(): List<String> = dsl.select(MOVEMENTS.VALUE).from(MOVEMENTS).fetch()
        .map { it.value1()!!.setScale(2).toPlainString() }

    private fun assertNames(query: String, vararg expected: String) {

        val names = mutableListOf<String>()

        restTestClient.get()
            .uri("$ENDPOINT_URL?size=50&$query")
            .exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                @Suppress("UNCHECKED_CAST")
                (body!!["content"] as List<Map<String, Any?>>).mapTo(names) { it["name"] as String }
            }

        assertThat(names).containsExactly(*expected)
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/financial/recurring-movements"
        private const val EXPENSE_CLASSIFICATION = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val INCOME_CLASSIFICATION = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
        private const val INACTIVE_CLASSIFICATION = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a03"
        private const val COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val INACTIVE_COST_CENTER = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a04"
        private const val OPEN_PERIOD = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val OTHER_OPEN_PERIOD = "6248abb7-a8ad-4d2b-a0a4-0417b98cb008"
        private const val CLOSED_PERIOD = "6531c609-577b-4a45-82a9-debe0b53eeab"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
        private const val OTHER_CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b02"
    }
}
