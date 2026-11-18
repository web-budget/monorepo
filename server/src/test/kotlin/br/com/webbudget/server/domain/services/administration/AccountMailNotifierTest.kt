package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

class AccountMailNotifierTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var accountMailNotifier: AccountMailNotifier

    @AfterEach
    fun restoreTheMainAdministrator() {
        dsl.update(USERS).set(USERS.ACTIVE, true).set(USERS.STATUS, "APPROVED")
            .where(USERS.EMAIL.eq(User.ADMIN_USERNAME)).execute()
    }

    @Test
    fun `should notify only the approved and active administrators`() {

        createLoginUser("english-admin@webbudget.com.br", TEST_PASSWORD, "ADMINISTRATION")
        createLoginUser("inactive-admin@webbudget.com.br", TEST_PASSWORD, "ADMINISTRATION", active = false)
        createLoginUser("pending-admin@webbudget.com.br", TEST_PASSWORD, "ADMINISTRATION")
        createLoginUser("blocked-admin@webbudget.com.br", TEST_PASSWORD, "ADMINISTRATION")
        createLoginUser("plain-user@webbudget.com.br", TEST_PASSWORD, "FINANCIAL")

        dsl.update(USERS).set(USERS.DEFAULT_LANGUAGE, Language.EN_US.name)
            .where(USERS.EMAIL.eq("english-admin@webbudget.com.br")).execute()
        dsl.update(USERS).set(USERS.STATUS, "PENDING").where(USERS.EMAIL.eq("pending-admin@webbudget.com.br")).execute()
        dsl.update(USERS).set(USERS.STATUS, "BLOCKED").where(USERS.EMAIL.eq("blocked-admin@webbudget.com.br")).execute()

        val newUser = User(name = "Newcomer", email = "newcomer@webbudget.com.br", password = "x", defaultLanguage = Language.PT_BR)

        accountMailNotifier.notifyPendingApproval(newUser)

        val messages = greenMail.receivedMessages.associateBy { message -> message.allRecipients.single().toString() }

        assertThat(messages.keys).containsExactlyInAnyOrder("admin@webbudget.com.br", "english-admin@webbudget.com.br")
        assertThat(messages.getValue("admin@webbudget.com.br").subject).isEqualTo("Novo usuário aguardando aprovação")
        assertThat(messages.getValue("english-admin@webbudget.com.br").subject).isEqualTo("New user waiting for approval")
    }

    @Test
    fun `should send nothing when there is no administrator to notify`() {

        dsl.update(USERS).set(USERS.ACTIVE, false).where(USERS.EMAIL.eq(User.ADMIN_USERNAME)).execute()

        assertThat(userRepository.findApprovedAdministrators()).isEmpty()

        accountMailNotifier.notifyPendingApproval(
            User(name = "Newcomer", email = "newcomer@webbudget.com.br", password = "x", defaultLanguage = Language.PT_BR)
        )

        assertThat(greenMail.receivedMessages).isEmpty()
    }

    @Test
    fun `should tell the owner in the language of the account that it was approved`() {

        accountMailNotifier.notifyAccountApproved(
            User(name = "Owner", email = "owner@webbudget.com.br", password = "x", defaultLanguage = Language.EN_US)
        )

        assertThat(greenMail.receivedMessages.single().subject).isEqualTo("Your account was approved")
    }
}
