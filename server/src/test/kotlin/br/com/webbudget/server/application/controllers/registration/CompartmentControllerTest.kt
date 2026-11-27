package br.com.webbudget.server.application.controllers.registration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.COMPARTMENT_MOVEMENTS
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
import java.time.LocalDate
import java.util.UUID

@Sql(
    "/sql/registration/clear-tables.sql",
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-compartments.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class CompartmentControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    fun `should require authentication and the registration role`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isUnauthorized

        authenticateWithRoles("FINANCIAL")

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should list the compartments of a wallet in the order they were created`() {

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(7)
            .jsonPath("$[0].name").isEqualTo("Emergency")
            .jsonPath("$[0].type").isEqualTo("RESERVE")
            .jsonPath("$[0].balance").isEqualTo(1000.0)
            .jsonPath("$[0].statementEntryCount").isEqualTo(3)
            .jsonPath("$[0].achieved").isEqualTo(false)
            .jsonPath("$[0].progress").doesNotExist()
            .jsonPath("$[1].name").isEqualTo("Stocks")
            .jsonPath("$[2].name").isEqualTo("Trip")
            .jsonPath("$[6].name").isEqualTo("Dateless goal")

        restTestClient.get()
            .uri("$WALLETS_URL/$INACTIVE_WALLET/compartments")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].name").isEqualTo("Frozen reserve")

        restTestClient.get()
            .uri("$WALLETS_URL/$OTHER_WALLET/compartments")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(0)

        restTestClient.get()
            .uri("$WALLETS_URL/${UUID.randomUUID()}/compartments")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should find a compartment with the goal calculations`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$TRIP")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Trip")
            .jsonPath("$.type").isEqualTo("GOAL")
            .jsonPath("$.description").isEqualTo("Trip to the beach")
            .jsonPath("$.targetValue").isEqualTo(1800.0)
            .jsonPath("$.targetDate").isEqualTo("2099-12-31")
            .jsonPath("$.progress").isEqualTo(0.5833)
            .jsonPath("$.achieved").isEqualTo(false)
            .jsonPath("$.overdue").isEqualTo(false)
            .jsonPath("$.monthlyAmount").isNumber

        restTestClient.get()
            .uri("$ENDPOINT_URL/$OLD_TRIP")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.overdue").isEqualTo(true)
            .jsonPath("$.achieved").isEqualTo(false)
            .jsonPath("$.monthlyAmount").doesNotExist()

        restTestClient.get()
            .uri("$ENDPOINT_URL/$DONE_GOAL")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.achieved").isEqualTo(true)
            .jsonPath("$.progress").isEqualTo(1.5)
            .jsonPath("$.overdue").isEqualTo(false)

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}")
            .exchange()
            .expectStatus().isNotFound

        restTestClient.get()
            .uri("$WALLETS_URL/$OTHER_WALLET/compartments/$TRIP")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should create a compartment of each type with zero balance`() {

        create("""{"name": "Car", "type": "RESERVE"}""")
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location).matches("http://localhost:[0-9]+/private/v1/registration/wallets/$WALLET/compartments/[0-9a-f-]{36}")
            }

        create("""{"name": "Broker", "type": "INVESTMENT"}""").expectStatus().isCreated

        val targetDate = LocalDate.now().plusMonths(6)

        create(
            """{"name": "House", "type": "GOAL", "description": "Down payment", "targetValue": 5000.00, "targetDate": "$targetDate"}"""
        ).expectStatus().isCreated

        val house = dsl.selectFrom(COMPARTMENTS).where(COMPARTMENTS.NAME.eq("House")).fetchSingle()

        assertThat(house.type).isEqualTo("GOAL")
        assertThat(house.balance).isEqualByComparingTo("0")
        assertThat(house.description).isEqualTo("Down payment")
        assertThat(house.targetValue).isEqualByComparingTo("5000.00")
        assertThat(house.targetDate).isEqualTo(targetDate)
        assertThat(house.idWallet).isEqualTo(9101L)
        assertThat(dsl.fetchCount(COMPARTMENTS.where(COMPARTMENTS.ID_WALLET.eq(9101L)))).isEqualTo(10)
    }

    @Test
    fun `should accept a goal with a target date today and without any goal field`() {

        create("""{"name": "Today", "type": "GOAL", "targetDate": "${LocalDate.now()}"}""").expectStatus().isCreated
        create("""{"name": "Plain goal", "type": "GOAL"}""").expectStatus().isCreated
    }

    @Test
    fun `should refuse a compartment with the name of another one of the same wallet`() {

        create("""{"name": "emergency", "type": "GOAL"}""")
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("duplicated-compartment-name")

        create("""{"name": "Emergency", "type": "RESERVE"}""").expectStatus().isEqualTo(409)

        restTestClient.post()
            .uri("$WALLETS_URL/$OTHER_WALLET/compartments")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Emergency", "type": "RESERVE"}""")
            .exchange()
            .expectStatus().isCreated

        assertThat(dsl.fetchCount(COMPARTMENTS)).isEqualTo(9)
    }

    @Test
    fun `should refuse an invalid compartment without saving anything`() {

        create("""{"name": "Reserve with goal", "type": "RESERVE", "description": "Not allowed"}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("compartment-goal-fields-not-allowed")

        create("""{"name": "Investment with target", "type": "INVESTMENT", "targetValue": 10.00}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("compartment-goal-fields-not-allowed")

        create("""{"name": "Investment with date", "type": "INVESTMENT", "targetDate": "2099-01-01"}""")
            .expectStatus().isBadRequest

        create("""{"name": "Zero", "type": "GOAL", "targetValue": 0}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-compartment-target-value")

        create("""{"name": "Negative", "type": "GOAL", "targetValue": -1.00}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-compartment-target-value")

        create("""{"name": "Past", "type": "GOAL", "targetDate": "${LocalDate.now().minusDays(1)}"}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("compartment-target-date-in-past")

        assertThat(dsl.fetchCount(COMPARTMENTS)).isEqualTo(8)
    }

    @Test
    fun `should validate the compartment form`() {

        create("""{"type": "RESERVE"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("is-null-or-blank")

        create("""{"name": "No type"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.type").isEqualTo("is-null")

        create("""{"name": "${"a".repeat(151)}", "type": "RESERVE"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.name").isEqualTo("has-max-chars-of-150")

        create("""{"name": "Long", "type": "GOAL", "description": "${"a".repeat(151)}"}""")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.description").isEqualTo("has-max-chars-of-150")
    }

    @Test
    fun `should refuse to create, edit or delete in an inactive wallet`() {

        restTestClient.post()
            .uri("$WALLETS_URL/$INACTIVE_WALLET/compartments")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "New", "type": "RESERVE"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-wallet")

        restTestClient.put()
            .uri("$WALLETS_URL/$INACTIVE_WALLET/compartments/$FROZEN_RESERVE")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Renamed"}""")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-wallet")

        dsl.update(COMPARTMENTS).set(COMPARTMENTS.BALANCE, BigDecimal.ZERO).where(COMPARTMENTS.ID.eq(9106L)).execute()

        restTestClient.delete()
            .uri("$WALLETS_URL/$INACTIVE_WALLET/compartments/$FROZEN_RESERVE")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-wallet")

        assertThat(dsl.fetchCount(COMPARTMENTS.where(COMPARTMENTS.ID_WALLET.eq(9102L)))).isEqualTo(1)
        assertThat(dsl.select(COMPARTMENTS.NAME).from(COMPARTMENTS).where(COMPARTMENTS.ID.eq(9106L)).fetchSingle().value1())
            .isEqualTo("Frozen reserve")
    }

    @Test
    fun `should edit the name and the goal fields but never the type or the balance`() {

        val targetDate = LocalDate.now().plusYears(1)

        update(
            TRIP,
            """{"name": "Big trip", "type": "RESERVE", "balance": 5, "description": "Abroad", "targetValue": 2500.00, "targetDate": "$targetDate"}"""
        )
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Big trip")
            .jsonPath("$.type").isEqualTo("GOAL")
            .jsonPath("$.balance").isEqualTo(1050.0)
            .jsonPath("$.description").isEqualTo("Abroad")
            .jsonPath("$.targetValue").isEqualTo(2500.0)

        val trip = dsl.selectFrom(COMPARTMENTS).where(COMPARTMENTS.ID.eq(9103L)).fetchSingle()

        assertThat(trip.type).isEqualTo("GOAL")
        assertThat(trip.balance).isEqualByComparingTo("1050.00")
        assertThat(trip.targetDate).isEqualTo(targetDate)
        assertThat(trip.version).isEqualTo(1.toShort())
        assertThat(trip.lastUpdate).isNotNull()
    }

    @Test
    fun `should edit an overdue goal without changing its date`() {

        update(OLD_TRIP, """{"name": "Old trip renamed", "targetValue": 600.00, "targetDate": "2020-01-01"}""")
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Old trip renamed")
            .jsonPath("$.overdue").isEqualTo(true)

        update(OLD_TRIP, """{"name": "Old trip renamed", "targetValue": 600.00, "targetDate": "2020-02-01"}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("compartment-target-date-in-past")

        update(OLD_TRIP, """{"name": "Old trip renamed", "targetValue": 600.00, "targetDate": "${LocalDate.now()}"}""")
            .expectStatus().isOk
    }

    @Test
    fun `should refuse an invalid edition`() {

        update(TRIP, """{"name": "emergency"}""")
            .expectStatus().isEqualTo(409)
            .expectBody()
            .jsonPath("$.error").isEqualTo("duplicated-compartment-name")

        update(TRIP, """{"name": "Trip", "targetValue": 0}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-compartment-target-value")

        update(EMERGENCY, """{"name": "Emergency", "description": "Not a goal"}""")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("compartment-goal-fields-not-allowed")

        update(EMERGENCY, """{"name": ""}""").expectStatus().isEqualTo(422)

        update(UUID.randomUUID().toString(), """{"name": "Unknown"}""").expectStatus().isNotFound

        update(EMERGENCY, """{"name": "Emergency"}""").expectStatus().isOk
    }

    @Test
    fun `should refuse to delete a compartment with balance`() {

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$EMERGENCY")
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("compartment-with-balance")
            .jsonPath("$.parameters.balance").isEqualTo(1000.0)

        assertThat(dsl.fetchCount(COMPARTMENTS.where(COMPARTMENTS.ID.eq(9101L)))).isEqualTo(1)
        assertThat(dsl.fetchCount(COMPARTMENT_MOVEMENTS.where(COMPARTMENT_MOVEMENTS.ID_COMPARTMENT.eq(9101L)))).isEqualTo(3)
    }

    @Test
    fun `should delete an empty compartment with its history and its statement lines leaving the balances alone`() {

        val entriesBefore = dsl.fetchCount(WALLET_ENTRIES)

        restTestClient.get()
            .uri("$ENDPOINT_URL/$EMPTY")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.statementEntryCount").isEqualTo(2)

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$EMPTY")
            .exchange()
            .expectStatus().isOk

        assertThat(dsl.fetchCount(COMPARTMENTS.where(COMPARTMENTS.ID.eq(9107L)))).isEqualTo(0)
        assertThat(dsl.fetchCount(COMPARTMENT_MOVEMENTS.where(COMPARTMENT_MOVEMENTS.ID_COMPARTMENT.eq(9107L)))).isEqualTo(0)
        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isEqualTo(entriesBefore - 2)

        val remaining = dsl.selectFrom(WALLET_ENTRIES).fetchSingle()

        assertThat(remaining.name).isEqualTo("Emergency")
        assertThat(remaining.previousBalance).isEqualByComparingTo("-150.00")
        assertThat(remaining.resultingBalance).isEqualByComparingTo("50.00")
        assertThat(dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(9101L)).fetchSingle().value1())
            .isEqualByComparingTo("50.00")

        restTestClient.delete()
            .uri("$ENDPOINT_URL/$EMPTY")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should delete a wallet without statement together with its zeroed compartments`() {

        dsl.deleteFrom(WALLET_ENTRIES).execute()
        dsl.deleteFrom(COMPARTMENT_MOVEMENTS).execute()
        dsl.deleteFrom(COMPARTMENTS).where(COMPARTMENTS.BALANCE.gt(BigDecimal.ZERO)).and(COMPARTMENTS.ID_WALLET.eq(9101L)).execute()

        assertThat(dsl.fetchCount(COMPARTMENTS.where(COMPARTMENTS.ID_WALLET.eq(9101L)))).isEqualTo(2)

        restTestClient.delete()
            .uri("$WALLETS_URL/$WALLET")
            .exchange()
            .expectStatus().isOk

        assertThat(dsl.fetchCount(COMPARTMENTS.where(COMPARTMENTS.ID_WALLET.eq(9101L)))).isEqualTo(0)
    }

    @Test
    fun `should show the totals of the wallets and sort the list by them`() {

        restTestClient.get()
            .uri("$WALLETS_URL/$WALLET")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.currentBalance").isEqualTo(50.0)
            .jsonPath("$.totalBalance").isEqualTo(3000.0)
            .jsonPath("$.compartmentCount").isEqualTo(7)

        restTestClient.get()
            .uri("$WALLETS_URL/$OTHER_WALLET")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.currentBalance").isEqualTo(0.0)
            .jsonPath("$.totalBalance").isEqualTo(0.0)
            .jsonPath("$.compartmentCount").isEqualTo(0)

        restTestClient.get()
            .uri("$WALLETS_URL?sort=totalBalance,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].name").isEqualTo("Financial test wallet")
            .jsonPath("$.content[0].totalBalance").isEqualTo(3000.0)
            .jsonPath("$.content[0].currentBalance").isEqualTo(50.0)
            .jsonPath("$.content[0].compartmentCount").isEqualTo(7)
            .jsonPath("$.content[1].name").isEqualTo("Financial test inactive wallet")
            .jsonPath("$.content[1].totalBalance").isEqualTo(200.0)
            .jsonPath("$.content[2].totalBalance").isEqualTo(0.0)

        restTestClient.get()
            .uri("$WALLETS_URL?sort=totalBalance,asc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].totalBalance").isEqualTo(0.0)
            .jsonPath("$.content[2].name").isEqualTo("Financial test wallet")
    }

    private fun create(body: String) = restTestClient.post()
        .uri(ENDPOINT_URL)
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun update(compartmentId: String, body: String) = restTestClient.put()
        .uri("$ENDPOINT_URL/$compartmentId")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    companion object {
        private const val WALLETS_URL = "/private/v1/registration/wallets"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val INACTIVE_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a02"
        private const val OTHER_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a05"
        private const val ENDPOINT_URL = "$WALLETS_URL/$WALLET/compartments"
        private const val EMERGENCY = "c0a1e9a0-0000-4000-8000-000000009101"
        private const val TRIP = "c0a1e9a0-0000-4000-8000-000000009103"
        private const val OLD_TRIP = "c0a1e9a0-0000-4000-8000-000000009104"
        private const val DONE_GOAL = "c0a1e9a0-0000-4000-8000-000000009105"
        private const val FROZEN_RESERVE = "c0a1e9a0-0000-4000-8000-000000009106"
        private const val EMPTY = "c0a1e9a0-0000-4000-8000-000000009107"
    }
}
