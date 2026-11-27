package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.financial.CompartmentMovement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.services.financial.CompartmentMovementService
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
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
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors

@Sql(
    "/sql/registration/clear-tables.sql",
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-compartments.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class CompartmentMovementControllerTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var compartmentMovementService: CompartmentMovementService

    @Autowired
    private lateinit var movementReferenceRepository: MovementReferenceRepository

    @Test
    fun `should require authentication and the financial role`() {

        authenticateAnonymously()

        restTestClient.get()
            .uri("$ENDPOINT_URL/$STOCKS/movements")
            .exchange()
            .expectStatus().isUnauthorized

        restTestClient.get()
            .uri(RESERVE_URL)
            .exchange()
            .expectStatus().isUnauthorized

        authenticateWithRoles("REGISTRATION")

        restTestClient.get()
            .uri("$ENDPOINT_URL/$STOCKS/movements")
            .exchange()
            .expectStatus().isForbidden

        move(STOCKS, "DEPOSIT", "10.00").expectStatus().isForbidden

        restTestClient.get()
            .uri(RESERVE_URL)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should keep the compartment on the wallet statement when depositing`() {

        move(STOCKS, "DEPOSIT", "30.00", ", \"note\": \"Monthly\"")
            .expectStatus().isCreated
            .expectHeader().value("Location") { location ->
                assertThat(location).matches("http://localhost:[0-9]+/private/v1/financial/wallets/$WALLET/compartments/$STOCKS/movements/[0-9a-f-]{36}")
            }
            .expectBody()
            .jsonPath("$.movement.direction").isEqualTo("DEPOSIT")
            .jsonPath("$.movement.value").isEqualTo(30.0)
            .jsonPath("$.movement.note").isEqualTo("Monthly")
            .jsonPath("$.movement.previousBalance").isEqualTo(500.0)
            .jsonPath("$.movement.resultingBalance").isEqualTo(530.0)
            .jsonPath("$.compartmentBalance").isEqualTo(530.0)
            .jsonPath("$.walletBalance").isEqualTo(20.0)
            .jsonPath("$.entry.origin").isEqualTo("COMPARTMENT")
            .jsonPath("$.entry.direction").isEqualTo("DEBIT")
            .jsonPath("$.entry.name").isEqualTo("Stocks")
            .jsonPath("$.entry.previousBalance").isEqualTo(50.0)
            .jsonPath("$.entry.resultingBalance").isEqualTo(20.0)
            .jsonPath("$.entry.reference.type").isEqualTo("COMPARTMENT")
            .jsonPath("$.entry.reference.id").isEqualTo(STOCKS)

        assertThat(balanceOfWallet()).isEqualByComparingTo("20.00")
        assertThat(balanceOfCompartment(9102L)).isEqualByComparingTo("530.00")

        val movement = dsl.selectFrom(COMPARTMENT_MOVEMENTS).where(COMPARTMENT_MOVEMENTS.ID_COMPARTMENT.eq(9102L)).fetchSingle()
        val entry = dsl.selectFrom(WALLET_ENTRIES).where(WALLET_ENTRIES.ID_COMPARTMENT_MOVEMENT.eq(movement.id)).fetchSingle()

        assertThat(movement.note).isEqualTo("Monthly")
        assertThat(entry.idWallet).isEqualTo(9101L)
        assertThat(entry.origin).isEqualTo("COMPARTMENT")
        assertThat(entry.idFinancialPeriod).isNull()
        assertThat(entry.idMovement).isNull()
        assertThat(entry.idTransfer).isNull()
    }

    @Test
    fun `should return the money to the free balance when withdrawing`() {

        move(EMERGENCY, "WITHDRAWAL", "200.00")
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.movement.direction").isEqualTo("WITHDRAWAL")
            .jsonPath("$.movement.previousBalance").isEqualTo(1000.0)
            .jsonPath("$.movement.resultingBalance").isEqualTo(800.0)
            .jsonPath("$.walletBalance").isEqualTo(250.0)
            .jsonPath("$.entry.direction").isEqualTo("CREDIT")
            .jsonPath("$.entry.name").isEqualTo("Emergency")

        assertThat(balanceOfWallet()).isEqualByComparingTo("250.00")
        assertThat(balanceOfCompartment(9101L)).isEqualByComparingTo("800.00")
    }

    @Test
    fun `should not change the total of the wallet`() {

        val totalBefore = totalOfWallet()

        move(STOCKS, "DEPOSIT", "123.45").expectStatus().isCreated
        move(EMERGENCY, "WITHDRAWAL", "10.01").expectStatus().isCreated
        move(TRIP, "DEPOSIT", "0.01").expectStatus().isCreated

        assertThat(totalOfWallet()).isEqualByComparingTo(totalBefore)
    }

    @Test
    fun `should accept to deposit more than the free balance leaving it negative`() {

        move(STOCKS, "DEPOSIT", "100.00")
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.walletBalance").isEqualTo(-50.0)
            .jsonPath("$.compartmentBalance").isEqualTo(600.0)

        assertThat(balanceOfWallet()).isEqualByComparingTo("-50.00")
    }

    @Test
    fun `should withdraw the whole balance but refuse to withdraw more than it`() {

        move(EMERGENCY, "WITHDRAWAL", "1000.01")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("insufficient-compartment-balance")
            .jsonPath("$.parameters.balance").isEqualTo(1000.0)

        assertThat(balanceOfCompartment(9101L)).isEqualByComparingTo("1000.00")
        assertThat(balanceOfWallet()).isEqualByComparingTo("50.00")
        assertThat(dsl.fetchCount(COMPARTMENT_MOVEMENTS)).isEqualTo(5)
        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isEqualTo(3)

        move(EMERGENCY, "WITHDRAWAL", "1000.00").expectStatus().isCreated

        assertThat(balanceOfCompartment(9101L)).isEqualByComparingTo("0.00")

        move(EMERGENCY, "WITHDRAWAL", "0.01").expectStatus().isBadRequest
    }

    @Test
    fun `should refuse an invalid movement without saving anything`() {

        move(STOCKS, "DEPOSIT", "0")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-compartment-movement-value")

        move(STOCKS, "WITHDRAWAL", "-5.00")
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("invalid-compartment-movement-value")

        move(FROZEN_RESERVE, "DEPOSIT", "10.00", wallet = INACTIVE_WALLET)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-wallet")

        move(FROZEN_RESERVE, "WITHDRAWAL", "10.00", wallet = INACTIVE_WALLET)
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.error").isEqualTo("inactive-wallet")

        restTestClient.post()
            .uri("$ENDPOINT_URL/$STOCKS/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"value": 10.00}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.direction").isEqualTo("is-null")

        restTestClient.post()
            .uri("$ENDPOINT_URL/$STOCKS/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"direction": "DEPOSIT"}""")
            .exchange()
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.value").isEqualTo("is-null")

        move(STOCKS, "DEPOSIT", "10.00", ", \"note\": \"${"a".repeat(151)}\"")
            .expectStatus().isEqualTo(422)
            .expectBody()
            .jsonPath("$.parameters.note").isEqualTo("has-max-chars-of-150")

        move(UUID.randomUUID().toString(), "DEPOSIT", "10.00").expectStatus().isNotFound
        move(STOCKS, "DEPOSIT", "10.00", wallet = OTHER_WALLET).expectStatus().isNotFound
        move(STOCKS, "DEPOSIT", "10.00", wallet = UUID.randomUUID().toString()).expectStatus().isNotFound

        assertThat(balanceOfWallet()).isEqualByComparingTo("50.00")
        assertThat(balanceOfCompartment(9102L)).isEqualByComparingTo("500.00")
        assertThat(dsl.fetchCount(COMPARTMENT_MOVEMENTS)).isEqualTo(5)
    }

    @Test
    fun `should let only one of two concurrent withdrawals pass over the balance`() {

        val compartment = movementReferenceRepository.findCompartment(UUID.fromString(WALLET), UUID.fromString(EMERGENCY))!!

        val barrier = CyclicBarrier(2)
        val executor = Executors.newFixedThreadPool(2)

        val outcomes = try {
            executor.invokeAll(
                (1..2).map {
                    Callable {
                        barrier.await()
                        runCatching {
                            compartmentMovementService.move(
                                CompartmentMovement(compartment, CompartmentMovement.Direction.WITHDRAWAL, BigDecimal("600.00"))
                            )
                        }
                    }
                }
            ).map { it.get() }
        } finally {
            executor.shutdown()
        }

        assertThat(outcomes.count { it.isSuccess }).isEqualTo(1)
        assertThat(outcomes.single { it.isFailure }.exceptionOrNull()).isInstanceOf(DomainException::class.java)
        assertThat(balanceOfCompartment(9101L)).isEqualByComparingTo("400.00")
        assertThat(balanceOfWallet()).isEqualByComparingTo("650.00")
        assertThat(dsl.fetchCount(COMPARTMENT_MOVEMENTS)).isEqualTo(6)
        assertThat(dsl.fetchCount(WALLET_ENTRIES)).isEqualTo(4)
    }

    @Test
    fun `should keep the balances chained after many movements`() {

        repeat(3) { move(STOCKS, "DEPOSIT", "10.00").expectStatus().isCreated }
        repeat(2) { move(STOCKS, "WITHDRAWAL", "5.00").expectStatus().isCreated }

        val movements = dsl.selectFrom(COMPARTMENT_MOVEMENTS)
            .where(COMPARTMENT_MOVEMENTS.ID_COMPARTMENT.eq(9102L))
            .orderBy(COMPARTMENT_MOVEMENTS.ID)
            .fetch()

        assertThat(movements).hasSize(5)
        movements.zipWithNext().forEach { (previous, next) ->
            assertThat(next.previousBalance).isEqualByComparingTo(previous.resultingBalance)
        }
        assertThat(movements.last().resultingBalance).isEqualByComparingTo(balanceOfCompartment(9102L))
        assertThat(balanceOfCompartment(9102L)).isEqualByComparingTo("520.00")
        assertThat(balanceOfWallet()).isEqualByComparingTo("30.00")
    }

    @Test
    fun `should list the history from the newest movement with the balances of the compartment`() {

        restTestClient.get()
            .uri("$ENDPOINT_URL/$EMERGENCY/movements")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.content[0].direction").isEqualTo("WITHDRAWAL")
            .jsonPath("$.content[0].value").isEqualTo(200.0)
            .jsonPath("$.content[0].note").isEqualTo("Car")
            .jsonPath("$.content[0].previousBalance").isEqualTo(1200.0)
            .jsonPath("$.content[0].resultingBalance").isEqualTo(1000.0)
            .jsonPath("$.content[0].entryId").isEqualTo("c0a1e9a0-2222-4000-8000-000000009103")
            .jsonPath("$.content[1].direction").isEqualTo("DEPOSIT")
            .jsonPath("$.content[1].entryId").doesNotExist()
            .jsonPath("$.content[2].resultingBalance").isEqualTo(700.0)

        restTestClient.get()
            .uri("$ENDPOINT_URL/$EMERGENCY/movements?sort=createdOn,asc&size=2&page=1")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.content[0].resultingBalance").isEqualTo(1000.0)
            .jsonPath("$.page.totalPages").isEqualTo(2)

        restTestClient.get()
            .uri("$ENDPOINT_URL/$EMERGENCY/movements?sort=value,desc")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.content[0].value").isEqualTo(700.0)
            .jsonPath("$.content[2].value").isEqualTo(200.0)

        restTestClient.get()
            .uri("$ENDPOINT_URL/${UUID.randomUUID()}/movements")
            .exchange()
            .expectStatus().isNotFound

        restTestClient.get()
            .uri("$WALLETS_URL/$OTHER_WALLET/compartments/$EMERGENCY/movements")
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should tell the position of a movement in the history`() {

        position(EMERGENCY, MOVEMENT_NEWEST, "").expectStatus().isOk.expectBody().jsonPath("$.position").isEqualTo(0)
        position(EMERGENCY, MOVEMENT_OLDEST, "").expectStatus().isOk.expectBody().jsonPath("$.position").isEqualTo(2)
        position(EMERGENCY, MOVEMENT_OLDEST, "?sort=createdOn,asc").expectStatus().isOk
            .expectBody().jsonPath("$.position").isEqualTo(0)
        position(EMERGENCY, MOVEMENT_OLDEST, "?sort=value,desc").expectStatus().isOk
            .expectBody().jsonPath("$.position").isEqualTo(0)

        position(EMERGENCY, UUID.randomUUID().toString(), "").expectStatus().isNotFound
        position(EMPTY, MOVEMENT_OLDEST, "").expectStatus().isNotFound
        position(UUID.randomUUID().toString(), MOVEMENT_OLDEST, "").expectStatus().isNotFound
    }

    @Test
    fun `should sum the reserve of all the wallets, active or not`() {

        restTestClient.get()
            .uri(RESERVE_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.balance").isEqualTo(1200.0)

        move(EMERGENCY, "WITHDRAWAL", "300.00").expectStatus().isCreated

        restTestClient.get()
            .uri(RESERVE_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.balance").isEqualTo(900.0)
    }

    @Test
    fun `should show the compartment lines on the statement, filter them and detail them`() {

        restTestClient.get()
            .uri("$STATEMENT_URL?origins=COMPARTMENT")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.content[0].name").isEqualTo("Emergency")
            .jsonPath("$.content[0].origin").isEqualTo("COMPARTMENT")
            .jsonPath("$.content[0].direction").isEqualTo("CREDIT")
            .jsonPath("$.content[0].reference.type").isEqualTo("COMPARTMENT")
            .jsonPath("$.content[0].reference.id").isEqualTo(EMERGENCY)
            .jsonPath("$.content[0].reference.movementId").isEqualTo(MOVEMENT_NEWEST)
            .jsonPath("$.content[1].reference.id").isEqualTo(EMPTY)

        restTestClient.get()
            .uri("$STATEMENT_URL?origins=TRANSFER,ADJUSTMENT")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(0)

        restTestClient.get()
            .uri("$STATEMENT_URL/c0a1e9a0-2222-4000-8000-000000009103")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.wallet.name").isEqualTo("Financial test wallet")
            .jsonPath("$.compartment.id").isEqualTo(EMERGENCY)
            .jsonPath("$.compartment.name").isEqualTo("Emergency")
            .jsonPath("$.compartment.movementId").isEqualTo(MOVEMENT_NEWEST)
            .jsonPath("$.compartment.direction").isEqualTo("WITHDRAWAL")
            .jsonPath("$.compartment.note").isEqualTo("Car")
    }

    @Test
    fun `should keep the name the line had when the compartment is renamed`() {

        move(STOCKS, "DEPOSIT", "10.00").expectStatus().isCreated

        restTestClient.put()
            .uri("$WALLETS_URL/$WALLET/compartments/$STOCKS")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "Shares"}""")
            .exchange()
            .expectStatus().isOk

        restTestClient.get()
            .uri("$STATEMENT_URL?origins=COMPARTMENT&filter=Stocks")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page.totalElements").isEqualTo(1)
            .jsonPath("$.content[0].name").isEqualTo("Stocks")
    }

    private fun move(
        compartment: String,
        direction: String,
        value: String,
        extra: String = "",
        wallet: String = WALLET
    ) = restTestClient.post()
        .uri("$WALLETS_URL_FINANCIAL/$wallet/compartments/$compartment/movements")
        .contentType(MediaType.APPLICATION_JSON)
        .body("""{"direction": "$direction", "value": $value$extra}""")
        .exchange()

    private fun position(compartment: String, movement: String, query: String) = restTestClient.get()
        .uri("$WALLETS_URL_FINANCIAL/$WALLET/compartments/$compartment/movements/$movement/position$query")
        .exchange()

    private fun balanceOfWallet(): BigDecimal =
        dsl.select(WALLETS.CURRENT_BALANCE).from(WALLETS).where(WALLETS.ID.eq(9101L)).fetchSingle().value1()!!

    private fun balanceOfCompartment(id: Long): BigDecimal =
        dsl.select(COMPARTMENTS.BALANCE).from(COMPARTMENTS).where(COMPARTMENTS.ID.eq(id)).fetchSingle().value1()!!

    private fun totalOfWallet(): BigDecimal = balanceOfWallet().add(
        dsl.select(org.jooq.impl.DSL.sum(COMPARTMENTS.BALANCE)).from(COMPARTMENTS).where(COMPARTMENTS.ID_WALLET.eq(9101L))
            .fetchSingle().value1()!!
    )

    companion object {
        private const val WALLETS_URL = "/private/v1/registration/wallets"
        private const val WALLETS_URL_FINANCIAL = "/private/v1/financial/wallets"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
        private const val INACTIVE_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a02"
        private const val OTHER_WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a05"
        private const val ENDPOINT_URL = "$WALLETS_URL_FINANCIAL/$WALLET/compartments"
        private const val STATEMENT_URL = "$WALLETS_URL_FINANCIAL/$WALLET/statement"
        private const val RESERVE_URL = "/private/v1/financial/compartments/reserve"
        private const val EMERGENCY = "c0a1e9a0-0000-4000-8000-000000009101"
        private const val STOCKS = "c0a1e9a0-0000-4000-8000-000000009102"
        private const val TRIP = "c0a1e9a0-0000-4000-8000-000000009103"
        private const val FROZEN_RESERVE = "c0a1e9a0-0000-4000-8000-000000009106"
        private const val EMPTY = "c0a1e9a0-0000-4000-8000-000000009107"
        private const val MOVEMENT_NEWEST = "c0a1e9a0-1111-4000-8000-000000009105"
        private const val MOVEMENT_OLDEST = "c0a1e9a0-1111-4000-8000-000000009103"
    }
}
