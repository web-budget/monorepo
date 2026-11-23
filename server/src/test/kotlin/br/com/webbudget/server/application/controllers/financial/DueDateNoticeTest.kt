package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.services.financial.DueDateNoticeService
import br.com.webbudget.server.infrastructure.config.DueDateNoticeScheduler
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.utilities.contents
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.context.jdbc.Sql
import org.springframework.test.context.jdbc.Sql.ExecutionPhase.AFTER_TEST_METHOD
import java.time.LocalDate

@Sql("/sql/financial/clear-tables.sql", "/sql/financial/create-registration-data.sql")
@Sql("/sql/financial/clear-tables.sql", executionPhase = AFTER_TEST_METHOD)
class DueDateNoticeTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dueDateNoticeService: DueDateNoticeService

    @Autowired
    private lateinit var dueDateNoticeScheduler: DueDateNoticeScheduler

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `should warn once per recipient about what is due on the day`() {

        createMovement("Rent", "EXPENSE", "1200.50", "2024-12-10")
        createMovement("Salary", "INCOME", "8000.00", "2024-12-10")
        createMovement("Tomorrow bill", "EXPENSE", "10.00", "2024-12-11")
        createMovement("Late bill", "EXPENSE", "10.00", "2024-12-09")
        createMovement("Paid bill", "EXPENSE", "10.00", "2024-12-10", paid = true)

        createLoginUser("finance@webbudget.com.br", roles = arrayOf("FINANCIAL"))

        assertThat(dueDateNoticeService.sendDaily(TODAY)).isEqualTo(2)

        val messages = greenMail.receivedMessages

        assertThat(messages).hasSize(2)
        assertThat(messages.flatMap { it.allRecipients.toList() }.map { it.toString() })
            .containsExactlyInAnyOrder("admin@webbudget.com.br", "finance@webbudget.com.br")

        val contents = messages.first().contents()

        assertThat(messages.first().subject).isEqualTo("Vencimentos de hoje (2)")
        assertThat(contents.html).contains("Rent", "− R$ 1.200,50", "Salary", "+ R$ 8.000,00", "Abrir os movimentos")
        assertThat(contents.html).contains("10/12", "/financeiro/movimentos")
        assertThat(contents.html).doesNotContain("Tomorrow bill", "Late bill", "Paid bill")
        assertThat(contents.plainText).contains("Rent", "Salary")
    }

    @Test
    fun `should send nothing when nothing is due`() {

        createMovement("Tomorrow bill", "EXPENSE", "10.00", "2024-12-20")

        assertThat(dueDateNoticeService.sendDaily(TODAY)).isZero()
        assertThat(dueDateNoticeService.sendWeekly(FRIDAY)).isZero()
        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should warn on friday about the week after, from monday to sunday`() {

        createMovement("Today bill", "EXPENSE", "10.00", "2024-12-06")
        createMovement("Sunday before", "EXPENSE", "10.00", "2024-12-08")
        createMovement("Monday bill", "EXPENSE", "20.00", "2024-12-09")
        createMovement("Sunday bill", "INCOME", "30.00", "2024-12-15")
        createMovement("Monday after", "EXPENSE", "10.00", "2024-12-16")

        assertThat(dueDateNoticeService.sendWeekly(FRIDAY)).isEqualTo(1)

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.subject).isEqualTo("Vencimentos da próxima semana (2)")
        assertThat(contents.html).contains("Monday bill", "Sunday bill", "09/12/2024", "15/12/2024")
        assertThat(contents.html).doesNotContain("Today bill", "Sunday before", "Monday after")
    }

    @Test
    fun `should only warn the approved, active users of the financial area that kept the notices on`() {

        val finance = createLoginUser("finance@webbudget.com.br", roles = arrayOf("FINANCIAL"))
        createLoginUser("registration@webbudget.com.br", roles = arrayOf("REGISTRATION"))
        createLoginUser("inactive@webbudget.com.br", roles = arrayOf("FINANCIAL"), active = false)
        val optedOut = createLoginUser("opted-out@webbudget.com.br", roles = arrayOf("FINANCIAL"))

        userRepository.updateDueDateNotices(optedOut.id!!, false)

        assertThat(userRepository.findDueDateNoticeRecipients().map { it.email })
            .containsExactly("admin@webbudget.com.br", finance.email)
    }

    @Test
    fun `should write the notice in the language of each recipient`() {

        createMovement("Rent", "EXPENSE", "1200.50", "2024-12-10")

        val english = createLoginUser("english@webbudget.com.br", roles = arrayOf("FINANCIAL"))
        userRepository.updateDefaultLanguage(english.id!!, Language.EN_US)

        dueDateNoticeService.sendDaily(TODAY)

        val message = greenMail.receivedMessages.first { message -> message.allRecipients.any { it.toString() == english.email } }

        assertThat(message.subject).isEqualTo("Due today (1)")
        assertThat(message.contents().html).contains("Open the movements", "− R$ 1,200.50", "Dec 10")
    }

    @Test
    fun `should turn the notices off and on from the profile`() {

        createLoginUser("finance@webbudget.com.br", roles = arrayOf("FINANCIAL"))
        authenticateAs("finance@webbudget.com.br", TEST_PASSWORD)

        restTestClient.get().uri("/private/v1/auth/session").exchange()
            .expectBody().jsonPath("$.dueDateNotices").isEqualTo(true)

        patchNotices("""{"enabled": false}""")
            .expectStatus().isOk
            .expectBody().jsonPath("$.dueDateNotices").isEqualTo(false)

        restTestClient.get().uri("/private/v1/auth/session").exchange()
            .expectBody().jsonPath("$.dueDateNotices").isEqualTo(false)

        assertThat(userRepository.findDueDateNoticeRecipients().map { it.email }).doesNotContain("finance@webbudget.com.br")

        patchNotices("""{"enabled": true}""")
            .expectStatus().isOk
            .expectBody().jsonPath("$.dueDateNotices").isEqualTo(true)

        patchNotices("""{}""")
            .expectStatus().isEqualTo(422)
            .expectBody().jsonPath("$.parameters.enabled").isEqualTo("is-null")
    }

    @Test
    fun `should answer unauthorized to the preference without a session`() {

        authenticateAnonymously()

        patchNotices("""{"enabled": false}""").expectStatus().isUnauthorized
    }

    @Test
    fun `should run the scheduled jobs`() {

        createMovement("Rent", "EXPENSE", "10.00", LocalDate.now().toString())

        dueDateNoticeScheduler.sendDaily()
        dueDateNoticeScheduler.sendWeekly()

        assertThat(greenMail.receivedMessages).isNotEmpty()
    }

    private fun patchNotices(body: String) = restTestClient.patch()
        .uri("/private/v1/auth/due-date-notices")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange()

    private fun createMovement(name: String, type: String, value: String, dueDate: String, paid: Boolean = false) {

        val classification = if (type == "INCOME") INCOME else EXPENSE
        val payment = if (paid) """, "payment": {"wallet": "$WALLET"}""" else ""

        restTestClient.post()
            .uri("/private/v1/financial/movements")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                """
                {"name": "$name", "type": "$type", "value": $value, "dueDate": "$dueDate", "financialPeriod": "$DECEMBER",
                 "classification": "$classification", "costCenter": "$COST_CENTER"$payment}
                """.trimIndent()
            )
            .exchange()
            .expectStatus().isCreated
    }

    companion object {
        private val TODAY = LocalDate.of(2024, 12, 10)
        private val FRIDAY = LocalDate.of(2024, 12, 6)
        private const val DECEMBER = "2a7b99bc-f077-4dbf-8458-87c5d0e8fd7a"
        private const val EXPENSE = "503cee43-583e-4df5-a9db-8bf049cf6a8d"
        private const val INCOME = "fd17c780-50b0-4669-9c1c-272c6f5d3413"
        private const val COST_CENTER = "338c8eea-6d53-4e68-882d-cec57c0ac49f"
        private const val WALLET = "7e1b6f3a-2c4d-4b8e-9a10-5d3f0c9b7a01"
    }
}
