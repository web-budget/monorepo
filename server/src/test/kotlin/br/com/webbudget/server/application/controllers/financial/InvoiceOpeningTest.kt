package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.financial.Invoice
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.services.registration.FinancialPeriodService
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import br.com.webbudget.server.infrastructure.repository.registration.FinancialPeriodRepository
import br.com.webbudget.server.jooq.financial.tables.references.INVOICES
import br.com.webbudget.server.jooq.registration.tables.references.CARDS
import br.com.webbudget.server.jooq.registration.tables.references.FINANCIAL_PERIODS
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import org.springframework.transaction.support.TransactionTemplate
import java.time.LocalDate
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql", "/sql/registration/create-wallets.sql", "/sql/registration/create-cards.sql")
@Sql("/sql/registration/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class InvoiceOpeningTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var invoiceRepository: InvoiceRepository

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var financialPeriodService: FinancialPeriodService

    @Autowired
    private lateinit var financialPeriodRepository: FinancialPeriodRepository

    @Test
    fun `should open one invoice for each active card when a period is created`() {

        createPeriod("01/2099", "2099-01-01", "2099-01-31")

        val invoices = dsl.selectFrom(INVOICES).fetch()
        val periodId = dsl.select(FINANCIAL_PERIODS.ID).from(FINANCIAL_PERIODS)
            .where(FINANCIAL_PERIODS.NAME.eq("01/2099")).fetchSingle().value1()
        val activeCardId = dsl.select(CARDS.ID).from(CARDS).where(CARDS.ACTIVE.isTrue).fetchSingle().value1()

        assertThat(invoices).hasSize(1)
        assertThat(invoices.single().status).isEqualTo("OPEN")
        assertThat(invoices.single().idCard).isEqualTo(activeCardId)
        assertThat(invoices.single().idFinancialPeriod).isEqualTo(periodId)
        assertThat(invoices.single().version).isEqualTo(0.toShort())
    }

    @Test
    fun `should open the invoices of every card on each new period`() {

        dsl.update(CARDS).set(CARDS.ACTIVE, true).execute()

        createPeriod("01/2099", "2099-01-01", "2099-01-31")
        createPeriod("02/2099", "2099-02-01", "2099-02-28")

        assertThat(dsl.fetchCount(INVOICES)).isEqualTo(4)
    }

    @Test
    fun `should not open invoices when there is no active card`() {

        dsl.update(CARDS).set(CARDS.ACTIVE, false).execute()

        createPeriod("01/2099", "2099-01-01", "2099-01-31")

        assertThat(dsl.fetchCount(INVOICES)).isZero()
    }

    @Test
    fun `should refuse a second invoice of the same card in the same period`() {

        createPeriod("01/2099", "2099-01-01", "2099-01-31")

        val invoice = dsl.selectFrom(INVOICES).fetchSingle()

        assertThatThrownBy {
            invoiceRepository.insert(invoice.idCard!!, invoice.idFinancialPeriod!!, Invoice.Status.OPEN)
        }.isInstanceOf(Exception::class.java)

        assertThat(invoiceRepository.existsByCardAndFinancialPeriod(invoice.idCard!!, invoice.idFinancialPeriod!!)).isTrue()
    }

    @Test
    fun `should create the period and its invoices in the same transaction`() {

        assertThatThrownBy {
            transactionTemplate.executeWithoutResult {
                financialPeriodService.create(FinancialPeriod("01/2099", LocalDate.of(2099, 1, 1), LocalDate.of(2099, 1, 31)))
                throw IllegalStateException("force the rollback")
            }
        }.isInstanceOf(IllegalStateException::class.java)

        assertThat(dsl.fetchCount(FINANCIAL_PERIODS)).isZero()
        assertThat(dsl.fetchCount(INVOICES)).isZero()
    }

    @Test
    fun `should delete the invoices of a period when the period is deleted`() {

        createPeriod("01/2099", "2099-01-01", "2099-01-31")

        val externalId = dsl.select(FINANCIAL_PERIODS.EXTERNAL_ID).from(FINANCIAL_PERIODS).fetchSingle().value1()!!

        restTestClient.delete()
            .uri("/private/v1/financial/financial-periods/$externalId")
            .exchange()
            .expectStatus().isOk

        assertThat(financialPeriodRepository.findByExternalId(externalId)).isNull()
        assertThat(dsl.fetchCount(INVOICES)).isZero()
    }

    @Test
    fun `should keep the invoices of the other periods when a period is deleted`() {

        createPeriod("01/2099", "2099-01-01", "2099-01-31")
        createPeriod("02/2099", "2099-02-01", "2099-02-28")

        val externalId = dsl.select(FINANCIAL_PERIODS.EXTERNAL_ID).from(FINANCIAL_PERIODS)
            .where(FINANCIAL_PERIODS.NAME.eq("01/2099")).fetchSingle().value1() as UUID

        restTestClient.delete()
            .uri("/private/v1/financial/financial-periods/$externalId")
            .exchange()
            .expectStatus().isOk

        assertThat(dsl.fetchCount(INVOICES)).isEqualTo(1)
    }

    private fun createPeriod(name: String, startingAt: String, endingAt: String) {
        restTestClient.post()
            .uri("/private/v1/financial/financial-periods")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"name": "$name", "startingAt": "$startingAt", "endingAt": "$endingAt"}""")
            .exchange()
            .expectStatus().isCreated
    }
}
