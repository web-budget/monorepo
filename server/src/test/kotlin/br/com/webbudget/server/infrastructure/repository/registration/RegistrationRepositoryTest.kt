package br.com.webbudget.server.infrastructure.repository.registration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.registration.Card
import br.com.webbudget.server.domain.entities.registration.Classification
import br.com.webbudget.server.domain.entities.registration.CostCenter
import br.com.webbudget.server.domain.entities.registration.FinancialPeriod
import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.domain.exceptions.DomainException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.test.context.jdbc.Sql
import java.time.LocalDate
import java.util.UUID

@Sql("/sql/registration/clear-tables.sql")
class RegistrationRepositoryTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var walletRepository: WalletRepository

    @Autowired
    private lateinit var cardRepository: CardRepository

    @Autowired
    private lateinit var classificationRepository: ClassificationRepository

    @Autowired
    private lateinit var costCenterRepository: CostCenterRepository

    @Autowired
    private lateinit var financialPeriodRepository: FinancialPeriodRepository

    @Test
    fun `should refuse to update a stale wallet`() {

        val wallet = walletRepository.insert(Wallet("Wallet", Wallet.Type.PERSONAL))
        val stale = walletRepository.findByExternalId(wallet.externalId!!)!!

        walletRepository.update(wallet)

        assertConflict { walletRepository.update(stale) }
    }

    @Test
    fun `should refuse to update a stale card`() {

        val wallet = walletRepository.insert(Wallet("Wallet", Wallet.Type.PERSONAL))
        val card = cardRepository.insert(Card("Card", "1234", 1, wallet = wallet))
        val stale = cardRepository.findByExternalId(card.externalId!!)!!

        cardRepository.update(card)

        assertConflict { cardRepository.update(stale) }
    }

    @Test
    fun `should refuse to update a stale classification`() {

        val classification = classificationRepository.insert(Classification("Classification", Classification.Type.INCOME))
        val stale = classificationRepository.findByExternalId(classification.externalId!!)!!

        classificationRepository.update(classification)

        assertConflict { classificationRepository.update(stale) }
    }

    @Test
    fun `should refuse to update a stale cost center`() {

        val costCenter = costCenterRepository.insert(CostCenter("Cost center", "Cost center"))
        val stale = costCenterRepository.findByExternalId(costCenter.externalId!!)!!

        costCenterRepository.update(costCenter)

        assertConflict { costCenterRepository.update(stale) }
    }

    @Test
    fun `should refuse to update a stale financial period`() {

        val period = financialPeriodRepository.insert(
            FinancialPeriod("Period", LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 31))
        )
        val stale = financialPeriodRepository.findByExternalId(period.externalId!!)!!

        financialPeriodRepository.update(period)

        assertConflict { financialPeriodRepository.update(stale) }
    }

    @Test
    fun `should not find unknown rows`() {

        val unknown = UUID.randomUUID()

        assertThat(walletRepository.findByExternalId(unknown)).isNull()
        assertThat(cardRepository.findByExternalId(unknown)).isNull()
        assertThat(classificationRepository.findByExternalId(unknown)).isNull()
        assertThat(costCenterRepository.findByExternalId(unknown)).isNull()
        assertThat(financialPeriodRepository.findByExternalId(unknown)).isNull()
    }

    private fun assertConflict(action: () -> Unit) {
        assertThatThrownBy(action)
            .isInstanceOfSatisfying(DomainException::class.java) { exception ->
                assertThat(exception.status).isEqualTo(HttpStatus.CONFLICT)
                assertThat(exception.error).isEqualTo("concurrent-update")
            }
    }
}
