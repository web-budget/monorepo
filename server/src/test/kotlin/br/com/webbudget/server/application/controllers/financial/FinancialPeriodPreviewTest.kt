package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.jooq.financial.tables.references.RECURRING_MOVEMENTS
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.util.UUID

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-recurring-movements.sql",
    "/sql/financial/create-invoices.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class FinancialPeriodPreviewTest : BaseIntegrationTest() {

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
    fun `should preview the automatic recurring movements and the open invoices a new period gets`() {

        restTestClient.get().uri(ENDPOINT_URL).exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.recurringMovements.length()").isEqualTo(1)
            .jsonPath("$.recurringMovements[0].id").isEqualTo(STREAMING)
            .jsonPath("$.recurringMovements[0].name").isEqualTo("Streaming")
            .jsonPath("$.recurringMovements[0].type").isEqualTo("EXPENSE")
            .jsonPath("$.recurringMovements[0].value").isEqualTo(39.9)
            .jsonPath("$.recurringMovements[0].installment").doesNotExist()
            .jsonPath("$.recurringMovements[0].installments").doesNotExist()
            .jsonPath("$.invoices.length()").isEqualTo(2)
            .jsonPath("$.invoices[0].id").isEqualTo(CARD)
            .jsonPath("$.invoices[0].name").isEqualTo("Financial test card")
            .jsonPath("$.invoices[0].lastFourDigits").isEqualTo("9101")
    }

    @Test
    fun `should show the next installment and leave out the finished ones and the inactive cards`() {

        dsl.update(RECURRING_MOVEMENTS)
            .set(RECURRING_MOVEMENTS.AUTO_LAUNCH, true)
            .set(RECURRING_MOVEMENTS.INSTALLMENTS, 2)
            .where(RECURRING_MOVEMENTS.EXTERNAL_ID.eq(UUID.fromString(PHONE)))
            .execute()
        dsl.update(CARDS).set(CARDS.ACTIVE, false).where(CARDS.ID.eq(9102L)).execute()

        restTestClient.get().uri(ENDPOINT_URL).exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.recurringMovements.length()").isEqualTo(2)
            .jsonPath("$.recurringMovements[?(@.name == 'Phone')].installment").isEqualTo(listOf(1))
            .jsonPath("$.recurringMovements[?(@.name == 'Phone')].installments").isEqualTo(listOf(2))
            .jsonPath("$.invoices.length()").isEqualTo(1)

        launch(PHONE)
        launch(PHONE, "6248abb7-a8ad-4d2b-a0a4-0417b98cb008")

        restTestClient.get().uri(ENDPOINT_URL).exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.recurringMovements.length()").isEqualTo(1)
            .jsonPath("$.recurringMovements[0].name").isEqualTo("Streaming")
    }

    private fun launch(recurringMovement: String, period: String = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a") {
        restTestClient.post()
            .uri("/private/v1/financial/recurring-movements/launch")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"financialPeriod": "$period", "recurringMovements": [{"id": "$recurringMovement"}]}""")
            .exchange()
            .expectStatus().isOk
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/financial/financial-periods/creation-preview"
        private const val STREAMING = "a1c0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c01"
        private const val PHONE = "a1c0e3b2-5d4f-4a6b-8c7d-0e1f2a3b4c03"
        private const val CARD = "3c9a7e52-1f4b-4d0a-8e6c-2b7d9f1a0b01"
    }
}
