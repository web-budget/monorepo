package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.web.servlet.client.RestTestClient.ResponseSpec

@Sql("/sql/financial/clear-tables.sql", "/sql/financial/create-registration-data.sql")
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class PeriodResultControllerTest : BaseIntegrationTest() {

    @Test
    fun `should require the financial role`() {

        authenticateWithRoles("REGISTRATION")

        restTestClient.get().uri(RESULTS).exchange().expectStatus().isForbidden
        restTestClient.get().uri("$RESULTS/accumulated").exchange().expectStatus().isForbidden
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-period-results.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should list, filter and sort the recorded results`() {

        assertNames("", "Financial test 12/2024", "Financial test 08/2024", "Financial test 07/2024")
        assertNames("from=2024-08-01", "Financial test 12/2024", "Financial test 08/2024")
        assertNames("to=2024-07-31", "Financial test 07/2024")
        assertNames("filter=12/2024", "Financial test 12/2024")
        assertNames("from=2024-08-01&to=2024-08-31", "Financial test 08/2024")
        assertNames("sort=name,asc", "Financial test 07/2024", "Financial test 08/2024", "Financial test 12/2024")
        assertNames("sort=result,desc", "Financial test 07/2024", "Financial test 12/2024", "Financial test 08/2024")
        assertNames("sort=endingAt,asc", "Financial test 07/2024", "Financial test 08/2024", "Financial test 12/2024")
        assertNames("sort=startingAt,desc", "Financial test 12/2024", "Financial test 08/2024", "Financial test 07/2024")

        restTestClient.get().uri("$RESULTS?size=2&page=1").exchange()
            .expectBody()
            .jsonPath("$.content.length()").isEqualTo(1)
            .jsonPath("$.page.totalElements").isEqualTo(3)
            .jsonPath("$.content[0].revenues").isEqualTo(10000.0)
            .jsonPath("$.content[0].expenses").isEqualTo(5000.0)
            .jsonPath("$.content[0].result").isEqualTo(5000.0)
            .jsonPath("$.content[0].financialPeriod.endingAt").isEqualTo("2024-07-31")
    }

    @Test
    @Sql(
        "/sql/financial/clear-tables.sql",
        "/sql/financial/create-registration-data.sql",
        "/sql/financial/create-period-results.sql"
    )
    @Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
    fun `should accumulate the recorded results`() {

        accumulated()
            .expectBody()
            .jsonPath("$.recorded").isEqualTo(8500.0)
            .jsonPath("$.provisional").isEqualTo(0)
            .jsonPath("$.accumulated").isEqualTo(8500.0)
            .jsonPath("$.provisionalPeriods.length()").isEqualTo(2)
    }

    @Test
    fun `should be zero when there is nothing and follow the closing and the reopening of a period`() {

        accumulated()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.recorded").isEqualTo(0)
            .jsonPath("$.accumulated").isEqualTo(0)

        createMovement("Salary", "INCOME", "1000.00", income = true)
        createMovement("Rent", "EXPENSE", "400.00")

        accumulated()
            .expectBody()
            .jsonPath("$.recorded").isEqualTo(0)
            .jsonPath("$.provisional").isEqualTo(600.0)
            .jsonPath("$.accumulated").isEqualTo(600.0)
            .jsonPath("$.provisionalPeriods.length()").isEqualTo(2)

        restTestClient.patch().uri("$PERIODS/$DECEMBER/close").exchange().expectStatus().isOk

        accumulated()
            .expectBody()
            .jsonPath("$.recorded").isEqualTo(600.0)
            .jsonPath("$.provisional").isEqualTo(0)
            .jsonPath("$.accumulated").isEqualTo(600.0)
            .jsonPath("$.provisionalPeriods.length()").isEqualTo(1)

        restTestClient.patch().uri("$PERIODS/$DECEMBER/reopen").exchange().expectStatus().isOk

        accumulated()
            .expectBody()
            .jsonPath("$.recorded").isEqualTo(0)
            .jsonPath("$.provisional").isEqualTo(600.0)
            .jsonPath("$.provisionalPeriods.length()").isEqualTo(2)
    }

    private fun accumulated(): ResponseSpec = restTestClient.get().uri("$RESULTS/accumulated").exchange()

    private fun createMovement(name: String, type: String, value: String, income: Boolean = false) {

        val classification = if (income) INCOME else EXPENSE

        restTestClient.post()
            .uri("/private/v1/financial/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "$name", "type": "$type", "value": $value, "financialPeriod": "$DECEMBER",
                 "classification": "$classification", "costCenter": "$COST_CENTER", "payment": {"wallet": "$WALLET"}}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isCreated
    }

    private fun assertNames(query: String, vararg expected: String) {

        val names = mutableListOf<String>()

        restTestClient.get()
            .uri("$RESULTS?size=50&$query")
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
        private const val PERIODS = "/private/v1/financial/financial-periods"
        private const val RESULTS = "/private/v1/financial/period-results"
        private const val DECEMBER = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val EXPENSE = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val INCOME = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
        private const val COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
    }
}
