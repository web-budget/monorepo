package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.time.LocalDateTime

class ListingSortOrderTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Test
    @Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-wallets.sql")
    fun `should list the wallets from the newest to the oldest by default`() {

        assertNames(
            "/registration/wallets",
            "",
            "Old wallet", "Bank account", "Investments", "Personal"
        )
        assertNames(
            "/registration/wallets",
            "sort=name,asc",
            "Bank account", "Investments", "Old wallet", "Personal"
        )
        assertNames(
            "/registration/wallets",
            "sort=name,desc",
            "Personal", "Old wallet", "Investments", "Bank account"
        )
    }

    @Test
    @Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-wallets.sql")
    fun `should order by the creation date before the id`() {

        dsl.update(WALLETS)
            .set(WALLETS.CREATED_ON, LocalDateTime.of(2000, 1, 1, 0, 0))
            .where(WALLETS.NAME.eq("Old wallet"))
            .execute()
        dsl.update(WALLETS)
            .set(WALLETS.CREATED_ON, LocalDateTime.of(2099, 1, 1, 0, 0))
            .where(WALLETS.NAME.eq("Personal"))
            .execute()

        assertNames(
            "/registration/wallets",
            "",
            "Personal", "Bank account", "Investments", "Old wallet"
        )
    }

    @Test
    @Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-wallets.sql", "/sql/registration/create-cards.sql")
    fun `should list the cards from the newest to the oldest by default`() {

        assertNames("/registration/cards", "", "XP Infinite", "Itau Personalite")
        assertNames("/registration/cards", "sort=name,asc", "Itau Personalite", "XP Infinite")
        assertNames("/registration/cards", "sort=name,desc", "XP Infinite", "Itau Personalite")
    }

    @Test
    @Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-classifications.sql")
    fun `should list the classifications from the newest to the oldest by default`() {

        assertNames("/registration/classifications", "", "Manutencao", "Vendas", "Conta de Luz", "Mercado")
        assertNames("/registration/classifications", "sort=name,asc", "Conta de Luz", "Manutencao", "Mercado", "Vendas")
        assertNames("/registration/classifications", "sort=name,desc", "Vendas", "Mercado", "Manutencao", "Conta de Luz")
    }

    @Test
    @Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-cost-centers.sql")
    fun `should list the cost centers from the newest to the oldest by default`() {

        assertNames("/registration/cost-centers", "", "Impostos", "Carro", "Outros")
        assertNames("/registration/cost-centers", "sort=name,asc", "Carro", "Impostos", "Outros")
        assertNames("/registration/cost-centers", "sort=name,desc", "Outros", "Impostos", "Carro")
    }

    @Test
    @Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-financial-periods.sql")
    fun `should list the financial periods from the newest to the oldest by default`() {

        assertNames("/registration/financial-periods", "status=ALL", "07/2024", "06/2024", "08/2024")
        assertNames("/registration/financial-periods", "status=ALL&sort=name,asc", "06/2024", "07/2024", "08/2024")
        assertNames("/registration/financial-periods", "status=ALL&sort=name,desc", "08/2024", "07/2024", "06/2024")
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-movements.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should list the movements from the newest to the oldest by default`() {

        assertNames("/financial/movements", "", "Groceries", "Salary", "Gym")
        assertNames("/financial/movements", "sort=name,asc", "Groceries", "Gym", "Salary")
        assertNames("/financial/movements", "sort=name,desc", "Salary", "Gym", "Groceries")
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-movements.sql",
        "/sql/financial/create-wallet-entries.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should list the wallet statement from the newest to the oldest by default`() {

        val path = "/financial/wallets/7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01/statement"

        assertNames(path, "", "Rounding", "Financial test other wallet", "Rent", "Deposit")
        assertNames(path, "sort=name,asc", "Deposit", "Financial test other wallet", "Rent", "Rounding")
        assertNames(path, "sort=name,desc", "Rounding", "Rent", "Financial test other wallet", "Deposit")
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-movements.sql",
        "/sql/financial/create-wallet-entries.sql",
        "/sql/financial/create-transfers.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should list the transfers by the transfer date, newest first, and ignore the name sort`() {

        val newest = "0b6e0c4a-6f3e-4c55-8a39-0d3c1c1f9a02"
        val middle = "0b6e0c4a-6f3e-4c55-8a39-0d3c1c1f9a01"
        val oldest = "0b6e0c4a-6f3e-4c55-8a39-0d3c1c1f9a03"

        assertIds("/financial/transfers", "", newest, middle, oldest)
        assertIds("/financial/transfers", "sort=name,asc", newest, middle, oldest)
        assertIds("/financial/transfers", "sort=createdOn,asc", oldest, middle, newest)
    }

    @Test
    @Sql("/sql/administration/clear-tables.sql", "/sql/administration/create-user.sql")
    fun `should list the users from the newest to the oldest by default`() {

        assertNames("/administration/users", "", "Other User", "User", "Administrador")
        assertNames("/administration/users", "sort=name,asc", "Administrador", "Other User", "User")
        assertNames("/administration/users", "sort=name,desc", "User", "Other User", "Administrador")
    }

    private fun assertNames(path: String, query: String, vararg expected: String) =
        assertProperty("name", path, query, *expected)

    private fun assertIds(path: String, query: String, vararg expected: String) =
        assertProperty("id", path, query, *expected)

    private fun assertProperty(property: String, path: String, query: String, vararg expected: String) {

        val names = mutableListOf<String>()

        restTestClient.get()
            .uri("/private/v1$path?size=50&$query")
            .exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                @Suppress("UNCHECKED_CAST")
                (body!!["content"] as List<Map<String, Any?>>).mapTo(names) { it[property] as String }
            }

        assertThat(names).containsExactly(*expected)
    }
}
