package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.financial.PeriodMovement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.financial.PeriodMovementRepository
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ACCOUNTED_PERIOD_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ACCOUNTED_PERIOD_MOVEMENT_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ACTIVE_PERIOD_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.ENDED_PERIOD_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.EXPENSE_CLASSIFICATION_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.HEALTH_COST_CENTER_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.INCOME_CLASSIFICATION_ID
import br.com.webbudget.server.utilities.fixtures.FinancialTestData.OPEN_PERIOD_MOVEMENT_ID
import br.com.webbudget.server.utilities.fixtures.createPeriodMovement
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
    "/sql/financial/create-period-movements.sql"
)
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class PeriodMovementServiceTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var periodMovementService: PeriodMovementService

    @Autowired
    private lateinit var periodMovementRepository: PeriodMovementRepository

    @Autowired
    private lateinit var movementReferenceRepository: MovementReferenceRepository

    @Test
    fun `should create a period movement`() {

        val periodMovement = newPeriodMovement(ACTIVE_PERIOD_ID)

        val externalId = periodMovementService.create(periodMovement)
        val saved = periodMovementRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

        assertThat(saved.id).isNotNull
        assertThat(saved.version).isEqualTo(0.toShort())
        assertThat(saved.createdOn).isNotNull
        assertThat(saved.lastUpdate).isNull()
        assertThat(saved.name).isEqualTo("The movement")
        assertThat(saved.dueDate).isEqualTo(LocalDate.of(2024, 12, 15))
        assertThat(saved.value).isEqualByComparingTo("10.99")
        assertThat(saved.state).isEqualTo(PeriodMovement.State.OPEN)
        assertThat(saved.quoteNumber).isNull()
        assertThat(saved.description).isEqualTo("Some description")
        assertThat(saved.financialPeriod.externalId).isEqualTo(ACTIVE_PERIOD_ID)
        assertThat(saved.classification.externalId).isEqualTo(EXPENSE_CLASSIFICATION_ID)
        assertThat(saved.costCenter.externalId).isEqualTo(HEALTH_COST_CENTER_ID)
    }

    @Test
    fun `should create a period movement in an ended financial period`() {

        val externalId = periodMovementService.create(newPeriodMovement(ENDED_PERIOD_ID))

        assertThat(periodMovementRepository.findByExternalId(externalId)).isNotNull
    }

    @Test
    fun `should not create when the financial period is not open`() {

        assertThatThrownBy { periodMovementService.create(newPeriodMovement(ACCOUNTED_PERIOD_ID)) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.error).isEqualTo("financial-period-not-open")
                assertThat(exception.status).isEqualTo(HttpStatus.BAD_REQUEST)
            }
    }

    @Test
    fun `should not create an accounted movement`() {

        val periodMovement = newPeriodMovement(ACTIVE_PERIOD_ID).apply { state = PeriodMovement.State.ACCOUNTED }

        assertThatThrownBy { periodMovementService.create(periodMovement) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.error).isEqualTo("accounted-period-movement")
            }
    }

    @Test
    fun `should update a period movement`() {

        val toUpdate = findPeriodMovement(OPEN_PERIOD_MOVEMENT_ID)

        toUpdate.apply {
            name = "Updated"
            value = BigDecimal("111.50")
            dueDate = LocalDate.of(2025, 1, 1)
            state = PeriodMovement.State.PAID
            description = null
            classification = movementReferenceRepository.findClassification(INCOME_CLASSIFICATION_ID)!!
        }

        periodMovementService.update(toUpdate)

        val updated = findPeriodMovement(OPEN_PERIOD_MOVEMENT_ID)

        assertThat(updated.version).isEqualTo(1.toShort())
        assertThat(updated.createdOn).isEqualTo(toUpdate.createdOn)
        assertThat(updated.lastUpdate).isNotNull
        assertThat(updated.name).isEqualTo("Updated")
        assertThat(updated.value).isEqualByComparingTo("111.50")
        assertThat(updated.dueDate).isEqualTo(LocalDate.of(2025, 1, 1))
        assertThat(updated.state).isEqualTo(PeriodMovement.State.PAID)
        assertThat(updated.description).isNull()
        assertThat(updated.classification.externalId).isEqualTo(INCOME_CLASSIFICATION_ID)
        assertThat(updated.financialPeriod.externalId).isEqualTo(ACTIVE_PERIOD_ID)
    }

    @Test
    fun `should not update when the financial period is not open`() {

        val toUpdate = findPeriodMovement(OPEN_PERIOD_MOVEMENT_ID).apply {
            financialPeriod = movementReferenceRepository.findFinancialPeriod(ACCOUNTED_PERIOD_ID)!!
        }

        assertThatThrownBy { periodMovementService.update(toUpdate) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.error).isEqualTo("financial-period-not-open")
            }
    }

    @Test
    fun `should not update an accounted movement`() {

        val toUpdate = findPeriodMovement(ACCOUNTED_PERIOD_MOVEMENT_ID).apply {
            financialPeriod = movementReferenceRepository.findFinancialPeriod(ACTIVE_PERIOD_ID)!!
            name = "Updated"
        }

        assertThatThrownBy { periodMovementService.update(toUpdate) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.error).isEqualTo("accounted-period-movement")
            }
    }

    @Test
    fun `should answer conflict when the movement was changed by someone else`() {

        val firstReader = findPeriodMovement(OPEN_PERIOD_MOVEMENT_ID)
        val secondReader = findPeriodMovement(OPEN_PERIOD_MOVEMENT_ID)

        periodMovementService.update(firstReader.apply { name = "First" })

        assertThatThrownBy { periodMovementService.update(secondReader.apply { name = "Second" }) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.error).isEqualTo("concurrent-update")
                assertThat(exception.status).isEqualTo(HttpStatus.CONFLICT)
            }

        assertThat(findPeriodMovement(OPEN_PERIOD_MOVEMENT_ID).name).isEqualTo("First")
    }

    @Test
    fun `should delete a period movement`() {

        periodMovementService.delete(findPeriodMovement(OPEN_PERIOD_MOVEMENT_ID))

        assertThat(periodMovementRepository.findByExternalId(OPEN_PERIOD_MOVEMENT_ID)).isNull()
    }

    @Test
    fun `should not delete an accounted movement`() {

        assertThatThrownBy { periodMovementService.delete(findPeriodMovement(ACCOUNTED_PERIOD_MOVEMENT_ID)) }
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.error).isEqualTo("accounted-period-movement")
            }

        assertThat(periodMovementRepository.findByExternalId(ACCOUNTED_PERIOD_MOVEMENT_ID)).isNotNull
    }

    private fun findPeriodMovement(externalId: UUID): PeriodMovement =
        periodMovementRepository.findByExternalId(externalId) ?: fail(OBJECT_NOT_FOUND_ERROR)

    private fun newPeriodMovement(financialPeriodId: UUID): PeriodMovement = createPeriodMovement(
        classification = movementReferenceRepository.findClassification(EXPENSE_CLASSIFICATION_ID)!!,
        costCenter = movementReferenceRepository.findCostCenter(HEALTH_COST_CENTER_ID)!!,
        financialPeriod = movementReferenceRepository.findFinancialPeriod(financialPeriodId)!!,
        description = "Some description"
    )
}
