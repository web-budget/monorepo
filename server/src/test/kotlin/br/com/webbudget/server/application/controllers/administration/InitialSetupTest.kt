package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.registration.Classification
import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.domain.services.registration.ClassificationService
import br.com.webbudget.server.domain.services.registration.CostCenterService
import br.com.webbudget.server.infrastructure.repository.registration.CostCenterRepository
import br.com.webbudget.server.jooq.administration.tables.references.INITIAL_SETUP
import br.com.webbudget.server.jooq.registration.tables.references.CLASSIFICATIONS
import br.com.webbudget.server.jooq.registration.tables.references.COST_CENTERS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.BEFORE_TEST_METHOD
import java.math.BigDecimal

@Sql("/sql/administration/clear-tables.sql", "/sql/registration/clear-tables.sql", executionPhase = BEFORE_TEST_METHOD)
@Sql("/sql/administration/clear-tables.sql", "/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class InitialSetupTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var costCenterService: CostCenterService

    @Autowired
    private lateinit var classificationService: ClassificationService

    @Autowired
    private lateinit var costCenterRepository: CostCenterRepository

    @Test
    fun `should require authentication`() {

        authenticateAnonymously()

        restTestClient.get().uri(ENDPOINT_URL).exchange().expectStatus().isUnauthorized
        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"option": "START_EMPTY"}""")
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should offer the template to the main admin of an empty instance`() {

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.pending").isEqualTo(true)
            .jsonPath("$.toCreate").isEqualTo(55)
            .jsonPath("$.existing").isEqualTo(0)
            .jsonPath("$.costCenters.toCreate").isEqualTo(14)
            .jsonPath("$.costCenters.existing").isEqualTo(0)
            .jsonPath("$.classifications.toCreate").isEqualTo(41)
            .jsonPath("$.classifications.existing").isEqualTo(0)

        assertThat(dsl.fetchCount(COST_CENTERS)).isZero()
        assertThat(dsl.fetchCount(CLASSIFICATIONS)).isZero()
        assertThat(sessionPending()).isTrue()
    }

    @Test
    fun `should create the template on an empty instance and stop offering it`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"option": "USE_TEMPLATE"}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.option").isEqualTo("USE_TEMPLATE")
            .jsonPath("$.created").isEqualTo(55)
            .jsonPath("$.existing").isEqualTo(0)
            .jsonPath("$.costCenters.created").isEqualTo(14)
            .jsonPath("$.classifications.created").isEqualTo(41)

        assertThat(dsl.fetchCount(COST_CENTERS)).isEqualTo(14)
        assertThat(budgetOf("Essenciais")).isEqualByComparingTo("50")
        assertThat(budgetOf("Estilo de vida")).isEqualByComparingTo("30")
        assertThat(budgetOf("Futuro")).isEqualByComparingTo("20")
        assertThat(budgetOf("Renda")).isNull()
        assertThat(budgetOf("Essenciais > Moradia")).isNull()
        assertThat(budgetOf("Futuro > Dívidas")).isNull()
        assertThat(dsl.fetchCount(COST_CENTERS, COST_CENTERS.ID_PARENT.isNull)).isEqualTo(4)
        assertThat(dsl.fetchCount(COST_CENTERS, COST_CENTERS.ACTIVE.isFalse.or(COST_CENTERS.DESCRIPTION.isNotNull))).isZero()

        assertThat(dsl.fetchCount(CLASSIFICATIONS)).isEqualTo(41)
        assertThat(dsl.fetchCount(CLASSIFICATIONS, CLASSIFICATIONS.TYPE.eq("EXPENSE"))).isEqualTo(33)
        assertThat(dsl.fetchCount(CLASSIFICATIONS, CLASSIFICATIONS.TYPE.eq("INCOME"))).isEqualTo(8)
        assertThat(dsl.fetchCount(CLASSIFICATIONS, CLASSIFICATIONS.NAME.eq("Seguro do veículo"))).isEqualTo(1)
        assertThat(dsl.fetchCount(CLASSIFICATIONS, CLASSIFICATIONS.ACTIVE.isFalse.or(CLASSIFICATIONS.DESCRIPTION.isNotNull))).isZero()

        val choice = dsl.selectFrom(INITIAL_SETUP).fetchSingle()
        assertThat(choice.choice).isEqualTo("USE_TEMPLATE")
        assertThat(choice.chosenOn).isNotNull

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.pending").isEqualTo(false)

        assertThat(sessionPending()).isFalse()
    }

    @Test
    fun `should create nothing when the main admin starts from scratch`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"option": "START_EMPTY"}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.option").isEqualTo("START_EMPTY")
            .jsonPath("$.created").isEqualTo(0)
            .jsonPath("$.existing").isEqualTo(0)

        assertThat(dsl.fetchCount(COST_CENTERS)).isZero()
        assertThat(dsl.fetchCount(CLASSIFICATIONS)).isZero()
        assertThat(dsl.selectFrom(INITIAL_SETUP).fetchSingle().choice).isEqualTo("START_EMPTY")
        assertThat(sessionPending()).isFalse()
    }

    @Test
    fun `should answer conflict to a second choice and create nothing again`() {

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"option": "USE_TEMPLATE"}""")
            .exchange()
            .expectStatus().isOk

        listOf("USE_TEMPLATE", "START_EMPTY").forEach { option ->
            restTestClient.post()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"option": "$option"}""")
                .exchange()
                .expectStatus().isEqualTo(409)
                .expectBody()
                .jsonPath("$.error").isEqualTo("initial-setup-already-chosen")
        }

        assertThat(dsl.fetchCount(COST_CENTERS)).isEqualTo(14)
        assertThat(dsl.fetchCount(CLASSIFICATIONS)).isEqualTo(41)
        assertThat(dsl.selectFrom(INITIAL_SETUP).fetchSingle().choice).isEqualTo("USE_TEMPLATE")
    }

    @Test
    fun `should refuse an option that is missing or unknown`() {

        listOf("{}", """{"option": "SOMETHING"}""").forEach { body ->
            restTestClient.post()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus().isEqualTo(422)
                .expectBody()
                .jsonPath("$.parameters.option").isEqualTo("is-null")
        }

        assertThat(dsl.fetchCount(INITIAL_SETUP)).isZero()
    }

    @Test
    fun `should answer forbidden to any user that is not the main admin, even with the administration role`() {

        val email = "not-the-main-admin@webbudget.com.br"
        createLoginUser(email, TEST_PASSWORD, "ADMINISTRATION", "REGISTRATION", "FINANCIAL", "DASHBOARDS")
        authenticateAs(email, TEST_PASSWORD)

        restTestClient.get().uri(ENDPOINT_URL).exchange().expectStatus().isForbidden
        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"option": "USE_TEMPLATE"}""")
            .exchange()
            .expectStatus().isForbidden

        assertThat(dsl.fetchCount(INITIAL_SETUP)).isZero()
        assertThat(dsl.fetchCount(COST_CENTERS)).isZero()
        assertThat(sessionPending()).isFalse()
    }

    @Test
    fun `should add the template to the existing data keeping what has the same name`() {

        val essentialsId = costCenterService.create(
            CostCenter(name = "essenciais", fullName = "essenciais", expenseBudgetPercentage = BigDecimal("10"))
        )
        val essentials = costCenterRepository.findByExternalId(essentialsId)!!
        costCenterService.create(CostCenter(name = "Moradia", fullName = "Moradia", parent = essentials))
        classificationService.create(Classification(name = "Salário", type = Classification.Type.EXPENSE))

        restTestClient.get()
            .uri(ENDPOINT_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.pending").isEqualTo(true)
            .jsonPath("$.toCreate").isEqualTo(52)
            .jsonPath("$.existing").isEqualTo(3)
            .jsonPath("$.costCenters.toCreate").isEqualTo(12)
            .jsonPath("$.costCenters.existing").isEqualTo(2)
            .jsonPath("$.classifications.toCreate").isEqualTo(40)
            .jsonPath("$.classifications.existing").isEqualTo(1)

        restTestClient.post()
            .uri(ENDPOINT_URL)
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"option": "USE_TEMPLATE"}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.created").isEqualTo(52)
            .jsonPath("$.existing").isEqualTo(3)
            .jsonPath("$.costCenters.created").isEqualTo(12)
            .jsonPath("$.costCenters.existing").isEqualTo(2)
            .jsonPath("$.classifications.created").isEqualTo(40)
            .jsonPath("$.classifications.existing").isEqualTo(1)

        assertThat(dsl.fetchCount(COST_CENTERS)).isEqualTo(14)
        assertThat(dsl.fetchCount(COST_CENTERS, COST_CENTERS.NAME.equalIgnoreCase("essenciais"))).isEqualTo(1)
        assertThat(budgetOf("essenciais")).isEqualByComparingTo("10")
        assertThat(dsl.fetchCount(COST_CENTERS, COST_CENTERS.NAME.eq("Moradia"))).isEqualTo(1)
        assertThat(dsl.fetchCount(COST_CENTERS, COST_CENTERS.FULL_NAME.eq("essenciais > Alimentação"))).isEqualTo(1)
        assertThat(budgetOf("Estilo de vida")).isEqualByComparingTo("30")

        assertThat(dsl.fetchCount(CLASSIFICATIONS)).isEqualTo(41)
        assertThat(dsl.fetchCount(CLASSIFICATIONS, CLASSIFICATIONS.NAME.eq("Salário"))).isEqualTo(1)
        assertThat(dsl.fetchCount(CLASSIFICATIONS, CLASSIFICATIONS.NAME.eq("Salário").and(CLASSIFICATIONS.TYPE.eq("EXPENSE")))).isEqualTo(1)
        assertThat(sessionPending()).isFalse()
    }

    @Test
    fun `should keep the whole template out when a failure happens in the middle of the creation`() {

        dsl.execute("ALTER TABLE registration.classifications ADD CONSTRAINT ck_test_block_last_item CHECK (name <> 'Outras receitas')")

        try {
            restTestClient.post()
                .uri(ENDPOINT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"option": "USE_TEMPLATE"}""")
                .exchange()
                .expectStatus().isBadRequest
        } finally {
            dsl.execute("ALTER TABLE registration.classifications DROP CONSTRAINT ck_test_block_last_item")
        }

        assertThat(dsl.fetchCount(COST_CENTERS)).isZero()
        assertThat(dsl.fetchCount(CLASSIFICATIONS)).isZero()
        assertThat(dsl.fetchCount(INITIAL_SETUP)).isZero()
        assertThat(sessionPending()).isTrue()
    }

    private fun budgetOf(fullName: String): BigDecimal? = dsl.select(COST_CENTERS.EXPENSE_BUDGET_PERCENTAGE)
        .from(COST_CENTERS)
        .where(COST_CENTERS.FULL_NAME.eq(fullName))
        .fetchSingle()
        .value1()

    private fun sessionPending(): Boolean {

        var pending: Boolean? = null

        restTestClient.get()
            .uri(SESSION_URL)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.initialSetupPending").value<Boolean> { pending = it }

        return pending!!
    }

    companion object {
        private const val ENDPOINT_URL = "/private/v1/initial-setup"
        private const val SESSION_URL = "/private/v1/auth/session"
    }
}
