package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.AccountActivationAttempt
import br.com.webbudget.server.domain.entities.administration.AuthProvider
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.PasswordRecoverAttempt
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.jooq.administration.tables.references.USERS
import br.com.webbudget.server.utilities.contents
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

class AccountEmailsTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var accountMailNotifier: AccountMailNotifier

    @Autowired
    private lateinit var userRepository: UserRepository

    private val token = UUID.fromString("5b0e8c4a-2f7d-4c61-9a3e-7d21f0b6c9e4")

    @AfterEach
    fun restoreTheMainAdministrator() {
        dsl.update(USERS)
            .set(USERS.DEFAULT_LANGUAGE, Language.PT_BR.name)
            .where(USERS.EMAIL.eq(User.ADMIN_USERNAME))
            .execute()
    }

    private fun user(
        language: Language,
        status: UserStatus = UserStatus.APPROVED,
        email: String = "maria.souza@example.com",
        name: String = "Maria Souza",
        authProvider: AuthProvider = AuthProvider.LOCAL
    ) = User(
        name = name, email = email, password = "x", defaultLanguage = language, status = status, authProvider = authProvider
    )

    @Test
    fun `should ask a self-registered account to confirm the e-mail, in Portuguese`() {

        val account = user(Language.PT_BR, UserStatus.PENDING)

        accountMailNotifier.notifyAccountActivation(account, AccountActivationAttempt(token, account))

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()
        val link = "http://localhost:8086/auth/account-activation?token=$token&amp;email=maria.souza%40example.com"

        assertThat(message.subject).isEqualTo("Confirme seu e-mail no webBudget")
        assertThat(contents.html).contains("<html lang=\"pt-BR\"", "<title>Confirme seu e-mail no webBudget</title>")
        assertThat(contents.html).contains("Falta um passo: confirme o e-mail para enviar seu cadastro para aprovação.")
        assertThat(contents.html).contains("Confirmação pendente", "Confirme seu e-mail", "Olá, Maria Souza.", "Confirmar e-mail")
        assertThat(contents.html).contains("um administrador revisa o cadastro e libera o acesso")
        assertThat(contents.html).contains("O link vale por 5 dias e só pode ser usado uma vez.")
        assertThat(contents.html).contains("href=\"$link\"", "Se o botão não funcionar", "alguém se cadastrou no webBudget com este endereço")
        assertThat(contents.html).doesNotContain("Senha", "E-mail de acesso")
        assertCleanOutput(contents.html)

        assertThat(contents.plainText).contains("Confirmação pendente", "Confirme seu e-mail", "Olá, Maria Souza.")
        assertThat(contents.plainText).contains("Confirmar e-mail: http://localhost:8086/auth/account-activation?token=$token&email=maria.souza%40example.com")
        assertThat(contents.plainText).contains("O link vale por 5 dias e só pode ser usado uma vez.")
    }

    @Test
    fun `should ask a self-registered account to confirm the e-mail, in English`() {

        val account = user(Language.EN_US, UserStatus.PENDING)

        accountMailNotifier.notifyAccountActivation(account, AccountActivationAttempt(token, account))

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.subject).isEqualTo("Confirm your email for webBudget")
        assertThat(contents.html).contains("<html lang=\"en-US\"", "Awaiting confirmation", "Confirm your email", "Hi Maria Souza.")
        assertThat(contents.html).contains("After you confirm, an administrator reviews the sign-up and grants access.")
        assertThat(contents.html).contains("Confirm email", "The link works for 5 days and only once.")
        assertThat(contents.html).contains("You’re getting this email because someone signed up for webBudget with this address.")
        assertCleanOutput(contents.html)
        assertThat(contents.plainText).contains("Confirm email: http://localhost:8086/auth/account-activation?token=$token")
    }

    @Test
    fun `should ask an account created by an administrator to activate it, in Portuguese`() {

        val account = user(Language.PT_BR)

        accountMailNotifier.notifyAccountActivation(account, AccountActivationAttempt(token, account))

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.subject).isEqualTo("Ative sua conta no webBudget")
        assertThat(contents.html).contains("Um administrador criou uma conta para você. Ative-a para entrar.")
        assertThat(contents.html).contains("Ativação pendente", "Ative sua conta", "Olá, Maria Souza.", "Ativar conta")
        assertThat(contents.html).contains("E-mail de acesso", "maria.souza@example.com", "a que o administrador definiu")
        assertThat(contents.html).contains("O link vale por 5 dias e só pode ser usado uma vez.")
        assertThat(contents.html).contains("um administrador do webBudget criou uma conta com este endereço")
        assertThat(contents.html).doesNotContain("um administrador revisa o cadastro")
        assertCleanOutput(contents.html)

        assertThat(contents.plainText).contains("E-mail de acesso: maria.souza@example.com", "Senha: a que o administrador definiu")
        assertThat(contents.plainText).contains("Ativar conta: http://localhost:8086/auth/account-activation?token=$token")
    }

    @Test
    fun `should ask an account created by an administrator to activate it, in English`() {

        val account = user(Language.EN_US)

        accountMailNotifier.notifyAccountActivation(account, AccountActivationAttempt(token, account))

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.subject).isEqualTo("Activate your webBudget account")
        assertThat(contents.html).contains("Awaiting activation", "Activate your account", "Hi Maria Souza.", "Activate account")
        assertThat(contents.html).contains("Sign-in email", "Password", "the one the administrator set")
        assertThat(contents.html).contains("The link works for 5 days and only once.")
        assertCleanOutput(contents.html)
        assertThat(contents.plainText).contains("Sign-in email: maria.souza@example.com", "Password: the one the administrator set")
    }

    @Test
    fun `should encode the plus sign of the e-mail in the activation and recovery links`() {

        val account = user(Language.PT_BR, UserStatus.PENDING, email = "a+b@x.com")

        accountMailNotifier.notifyAccountActivation(account, AccountActivationAttempt(token, account))
        accountMailNotifier.notifyPasswordRecovery(account, PasswordRecoverAttempt(token, account))

        val plainTexts = greenMail.receivedMessages.map { it.contents().plainText }

        assertThat(plainTexts).hasSize(2)
        assertThat(plainTexts).allSatisfy { plainText ->
            assertThat(plainText).contains("email=a%2Bb%40x.com").doesNotContain("a+b@x.com&", "email=a+b")
        }
    }

    @Test
    fun `should tell who asks for a new password that nothing changes if they ignore it, in Portuguese`() {

        val account = user(Language.PT_BR)

        accountMailNotifier.notifyPasswordRecovery(account, PasswordRecoverAttempt(token, account))

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.subject).isEqualTo("Redefina sua senha do webBudget")
        assertThat(contents.html).contains("<html lang=\"pt-BR\"", "<title>Redefina sua senha do webBudget</title>")
        assertThat(contents.html).contains("Use o link em até 3 horas para criar uma senha nova.")
        assertThat(contents.html).contains("Senha", "Redefina sua senha", "Olá, Maria Souza.", "Criar senha nova")
        assertThat(contents.html).contains("O link vale por 3 horas e só pode ser usado uma vez.")
        assertThat(contents.html).contains("<strong style=\"font-weight: 600;\">Não pediu?</strong> <span>Ignore este e-mail. Sua senha continua a mesma.</span>")
        assertThat(contents.html).contains("href=\"http://localhost:8086/auth/recover-password?token=$token&amp;email=maria.souza%40example.com\"")
        assertThat(contents.html).doesNotContain("administrador")
        assertCleanOutput(contents.html)

        assertThat(contents.plainText).contains("Criar senha nova: http://localhost:8086/auth/recover-password?token=$token")
        assertThat(contents.plainText).contains("Não pediu? Ignore este e-mail. Sua senha continua a mesma.")
    }

    @Test
    fun `should tell who asks for a new password that nothing changes if they ignore it, in English`() {

        val account = user(Language.EN_US)

        accountMailNotifier.notifyPasswordRecovery(account, PasswordRecoverAttempt(token, account))

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()

        assertThat(message.subject).isEqualTo("Reset your webBudget password")
        assertThat(contents.html).contains("<html lang=\"en-US\"", "Use the link within 3 hours to create a new password.")
        assertThat(contents.html).contains("Reset your password", "Hi Maria Souza.", "Create new password")
        assertThat(contents.html).contains("The link works for 3 hours and only once.", "Didn’t ask for this?")
        assertCleanOutput(contents.html)
        assertThat(contents.plainText).contains("Didn’t ask for this? Ignore this email. Your password stays the same.")
    }

    @Test
    fun `should show the pending sign-up to the administrator in Portuguese, with the time in the configured zone`() {

        val administratorName = userRepository.findByEmail(User.ADMIN_USERNAME)!!.name
        val newUser = user(Language.PT_BR).apply { createdOn = LocalDateTime.of(2026, 11, 20, 14, 32) }

        accountMailNotifier.notifyPendingApproval(newUser)

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()
        val expectedTime = newUser.createdOn!!.atZone(ZoneId.systemDefault()).withZoneSameInstant(ZoneId.of("America/Sao_Paulo"))
            .format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm", Locale.forLanguageTag("pt-BR")))

        assertThat(message.subject).isEqualTo("Cadastro aguardando aprovação: Maria Souza")
        assertThat(contents.html).contains("Maria Souza criou uma conta e só entra depois da aprovação de um administrador.")
        assertThat(contents.html).contains("Aguardando aprovação", "Novo cadastro para aprovar", "Olá, $administratorName.")
        assertThat(contents.html).contains("Nome", "E-mail", "maria.souza@example.com", "Cadastro por", "E-mail e senha", "Criada em", expectedTime)
        assertThat(contents.html).contains("Revisar cadastros pendentes", "href=\"http://localhost:8086/configuration/users?status=PENDING\"")
        assertThat(contents.html).contains("Você recebe este e-mail porque é administrador do webBudget.")
        assertCleanOutput(contents.html)

        assertThat(contents.plainText).contains("Nome: Maria Souza", "E-mail: maria.souza@example.com", "Cadastro por: E-mail e senha")
        assertThat(contents.plainText).contains("Criada em: $expectedTime")
        assertThat(contents.plainText).contains("Revisar cadastros pendentes: http://localhost:8086/configuration/users?status=PENDING")
    }

    @Test
    fun `should show the pending sign-up to the administrator in English and name the Google provider`() {

        dsl.update(USERS)
            .set(USERS.DEFAULT_LANGUAGE, Language.EN_US.name)
            .where(USERS.EMAIL.eq(User.ADMIN_USERNAME))
            .execute()

        val newUser = user(Language.PT_BR, authProvider = AuthProvider.GOOGLE).apply {
            createdOn = LocalDateTime.of(2026, 11, 20, 14, 32)
        }

        accountMailNotifier.notifyPendingApproval(newUser)

        val message = greenMail.receivedMessages.single()
        val contents = message.contents()
        val expectedTime = newUser.createdOn!!.atZone(ZoneId.systemDefault()).withZoneSameInstant(ZoneId.of("America/Sao_Paulo"))
            .format(DateTimeFormatter.ofPattern("MMM d, yyyy, h:mm a", Locale.forLanguageTag("en-US")))

        assertThat(message.subject).isEqualTo("Sign-up waiting for approval: Maria Souza")
        assertThat(contents.html).contains("<html lang=\"en-US\"", "Pending approval", "New sign-up to approve")
        assertThat(contents.html).contains("Signed up with", "Google account", "Created", expectedTime, "Review pending sign-ups")
        assertCleanOutput(contents.html)
        assertThat(contents.plainText).contains("Signed up with: Google account", "Created: $expectedTime")
    }

    @Test
    fun `should not let a name with line breaks inject a header through the subject`() {

        val newUser = user(Language.PT_BR, name = "Maria\r\nBcc: alguem@example.com")

        accountMailNotifier.notifyPendingApproval(newUser)

        val message = greenMail.receivedMessages.single()

        assertThat(message.subject).isEqualTo("Cadastro aguardando aprovação: Maria Bcc: alguem@example.com")
        assertThat(message.getHeader("Bcc")).isNull()
    }

    private fun assertCleanOutput(html: String) {
        assertThat(html).doesNotContainPattern("\\sth:[a-z-]+=")
        assertThat(html).doesNotContain("#{", "??", "\${", "{0}")
    }
}
