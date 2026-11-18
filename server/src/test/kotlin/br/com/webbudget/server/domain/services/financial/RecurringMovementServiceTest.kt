package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.financial.RecurringMovement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.RecurringMovementRepository
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ACTIVE_RECURRING_MOVEMENT_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ENDED_RECURRING_MOVEMENT_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.EXPENSE_CLASSIFICATION_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.HEALTH_COST_CENTER_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.HOME_COST_CENTER_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.INCOME_CLASSIFICATION_ID
import br.com.webbudget.server.utilities.fixtures.createRecurringMovement
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.assertj.core.api.Assertions.fail
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@Sql(
    "/sql/financial/clear-tables.sql",
    "/sql/financial/create-registration-data.sql",
    "/sql/financial/create-recurring-movements.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class RecurringMovementServiceTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var recurringMovementService: RecurringMovementService

    @Autowired
    private lateinit var recurringMovementRepository: RecurringMovementRepository

    @Autowired
    private lateinit var movementReferenceRepository: MovementReferenceRepository

    @Test
    fun `should create a recurring movement`() {

        val recurringMovement = createRecurringMovement(
            classification = movementReferenceRepository.findClassification(EXPENSE_CLASSIFICATION_ID)!!,
            costCenter = movementReferenceRepository.findCostCenter(HEALTH_COST_CENTER_ID)!!,
            indeterminate = false,
            totalQuotes = 12,
            startingQuote = 3,
            currentQuote = 3,
            description = "Some description"
        )

        val externalId = recurringMovementService.create(recurringMovement)
        val saved = findRecurringMovement(externalId)

        assertThat(saved.id).isNotNull
        assertThat(saved.version).isEqualTo(0.toShort())
        assertThat(saved.createdOn).isNotNull
        assertThat(saved.lastUpdate).isNull()
        assertThat(saved.name).isEqualTo("The movement")
        assertThat(saved.value).isEqualByComparingTo("10.99")
        assertThat(saved.startingAt).isEqualTo(LocalDate.of(2024, 1, 2))
        assertThat(saved.state).isEqualTo(RecurringMovement.State.ACTIVE)
        assertThat(saved.autoLaunch).isTrue()
        assertThat(saved.indeterminate).isFalse()
        assertThat(saved.totalQuotes).isEqualTo(12)
        assertThat(saved.startingQuote).isEqualTo(3)
        assertThat(saved.currentQuote).isEqualTo(3)
        assertThat(saved.description).isEqualTo("Some description")
        assertThat(saved.classification.externalId).isEqualTo(EXPENSE_CLASSIFICATION_ID)
        assertThat(saved.costCenter.externalId).isEqualTo(HEALTH_COST_CENTER_ID)
    }

    @Test
    fun `should update a recurring movement`() {

        val toUpdate = findRecurringMovement(ACTIVE_RECURRING_MOVEMENT_ID)

        toUpdate.apply {
            name = "Updated"
            value = BigDecimal("111.50")
            startingAt = LocalDate.of(2025, 1, 1)
            state = RecurringMovement.State.ENDED
            autoLaunch = false
            description = null
            classification = movementReferenceRepository.findClassification(INCOME_CLASSIFICATION_ID)!!
            costCenter = movementReferenceRepository.findCostCenter(HOME_COST_CENTER_ID)!!
        }

        recurringMovementService.update(toUpdate)

        val updated = findRecurringMovement(ACTIVE_RECURRING_MOVEMENT_ID)

        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.lastUpdate).isNotNull
        assertThat(updated.name).isEqualTo("Updated")
        assertThat(updated.value).isEqualByComparingTo("111.50")
        assertThat(updated.startingAt).isEqualTo(LocalDate.of(2025, 1, 1))
        assertThat(updated.state).isEqualTo(RecurringMovement.State.ENDED)
        assertThat(updated.autoLaunch).isFalse()
        assertThat(updated.description).isNull()
        assertThat(updated.classification.externalId).isEqualTo(INCOME_CLASSIFICATION_ID)
        assertThat(updated.costCenter.externalId).isEqualTo(HOME_COST_CENTER_ID)
    }

    @Test
    fun `should not update an ended recurring movement`() {

        val toUpdate = findRecurringMovement(ENDED_RECURRING_MOVEMENT_ID).apply { name = "Updated" }

        assertThatThrownBy { recurringMovementService.update(toUpdate) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.error).isEqualTo("recurring-movement.errors.invalid-state")
                assertThat(exception.status).isEqualTo(HttpStatus.BAD_REQUEST)
            }

        assertThat(findRecurringMovement(ENDED_RECURRING_MOVEMENT_ID).name).isEqualTo("Pilates")
    }

    @Test
    fun `should answer conflict when the movement was changed by someone else`() {

        val firstReader = findRecurringMovement(ACTIVE_RECURRING_MOVEMENT_ID)
        val secondReader = findRecurringMovement(ACTIVE_RECURRING_MOVEMENT_ID)

        recurringMovementService.update(firstReader.apply { name = "First" })

        assertThatThrownBy { recurringMovementService.update(secondReader.apply { name = "Second" }) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.error).isEqualTo("concurrent-update")
                assertThat(exception.status).isEqualTo(HttpStatus.CONFLICT)
            }
    }

    @Test
    fun `should delete a recurring movement`() {

        recurringMovementService.delete(findRecurringMovement(ENDED_RECURRING_MOVEMENT_ID))

        assertThat(recurringMovementRepository.findByExternalId(ENDED_RECURRING_MOVEMENT_ID)).isNull()
    }

    private fun findRecurringMovement(externalId: UUID): RecurringMovement =
        recurringMovementRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)
}
