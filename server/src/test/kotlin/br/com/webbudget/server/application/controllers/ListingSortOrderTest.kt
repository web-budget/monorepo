package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.jdbc.Sql
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
    @Sql("/sql/administration/clear-tables.sql", "/sql/administration/create-user.sql")
    fun `should list the users from the newest to the oldest by default`() {

        assertNames("/administration/users", "", "Other User", "User", "Administrador")
        assertNames("/administration/users", "sort=name,asc", "Administrador", "Other User", "User")
        assertNames("/administration/users", "sort=name,desc", "User", "Other User", "Administrador")
    }

    private fun assertNames(path: String, query: String, vararg expected: String) {

        val names = mutableListOf<String>()

        restTestClient.get()
            .uri("/private/v1$path?size=50&$query")
            .exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .value { body ->
                @Suppress("UNCHECKED_CAST")
                (body!!["content"] as List<Map<String, Any?>>).mapTo(names) { it["name"] as String }
            }

        assertThat(names).containsExactly(*expected)
    }
}
