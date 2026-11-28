package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.services.financial.DueDateNoticeNotifier.DueLine
import br.com.webbudget.server.infrastructure.config.MailTemplateConfiguration
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.thymeleaf.context.Context
import java.util.Locale

class MailTemplatesTest {

    private val configuration = MailTemplateConfiguration()

    private val engine = configuration.mailTemplateEngine(configuration.mailMessageSource())

    private fun render(locale: String, userName: String = "Maria Souza", template: String = "account-approved"): String {

        val context = Context(Locale.forLanguageTag(locale)).apply {
            setVariable("subject", "Assunto do e-mail")
            setVariable("preheader", "Texto de pré-cabeçalho")
            setVariable("applicationUrl", "https://webbudget.example.com")
            setVariable("loginUrl", "https://webbudget.example.com/login")
            setVariable("userName", userName)
            setVariable("userEmail", "maria.souza@example.com")
            setVariable("roles", "Financeiro, Cadastros")
        }

        return engine.process(template, context)
    }

    @Test
    fun `should render the approved account in Portuguese`() {

        val html = render("pt-BR")

        assertThat(html).contains("<html lang=\"pt-BR\"")
        assertThat(html).contains("<title>Assunto do e-mail</title>")
        assertThat(html).contains("Conta aprovada", "Sua conta foi aprovada", "Olá, Maria Souza.")
        assertThat(html).contains("E-mail de acesso", "maria.souza@example.com", "Áreas liberadas", "Financeiro, Cadastros")
        assertThat(html).contains("Entrar no webBudget", "href=\"https://webbudget.example.com/login\"")
        assertThat(html).contains("Se o botão não funcionar", "Você recebe este e-mail porque se cadastrou no webBudget.")
        assertThat(html).contains("Enviado automaticamente pelo webBudget", "href=\"https://webbudget.example.com\"")
        assertCleanOutput(html)
    }

    @Test
    fun `should render the approved account in English`() {

        val html = render("en-US")

        assertThat(html).contains("<html lang=\"en-US\"")
        assertThat(html).contains("Account approved", "Your account was approved", "Hi Maria Souza.")
        assertThat(html).contains("Sign-in email", "Your areas", "Sign in to webBudget")
        assertThat(html).contains("If the button doesn’t work", "You’re getting this email because you signed up for webBudget.")
        assertThat(html).contains("Sent automatically by webBudget")
        assertCleanOutput(html)
    }

    @Test
    fun `should draw the brand in HTML, with only the light theme and hex colors`() {

        val html = render("pt-BR")

        assertThat(html).contains("name=\"color-scheme\" content=\"light\"", "color-scheme: light")
        assertThat(html).contains("web</span><span", "Budget</span>", "wB<div")
        assertThat(html).contains("#0c6944", "#ffd890", "#d9f3e2", "max-width: 480px")
        assertThat(html).doesNotContain("prefers-color-scheme", "oklch(", "var(--", "<img", "fonts.googleapis")
        assertThat(html).contains("'IBM Plex Sans', -apple-system", "'IBM Plex Mono', SFMono-Regular")
    }

    @Test
    fun `should hide the preheader and the brand mark from assistive technology`() {

        val html = render("pt-BR")

        assertThat(html).containsPattern("<div aria-hidden=\"true\"[^>]*display: none[^>]*><span>Texto de pré-cabeçalho</span>")
        assertThat(html).containsPattern("<td aria-hidden=\"true\"[^>]*>wB")
    }

    @Test
    fun `should escape what comes from the user`() {

        val html = render("pt-BR", userName = "<script>alert(1)</script>")

        assertThat(html).contains("&lt;script&gt;alert(1)&lt;/script&gt;")
        assertThat(html).doesNotContain("<script>")
    }

    @Test
    fun `should make a plain text that carries the same content`() {

        val plainText = MailPlainText.from(render("pt-BR"))

        assertThat(plainText).startsWith("webBudget")
        assertThat(plainText).contains("Conta aprovada")
        assertThat(plainText).contains("E-mail de acesso: maria.souza@example.com")
        assertThat(plainText).contains("Áreas liberadas: Financeiro, Cadastros")
        assertThat(plainText).contains("Entrar no webBudget: https://webbudget.example.com/login")
        assertThat(plainText).doesNotContain("Texto de pré-cabeçalho", "●", "wB", "<")
        assertThat(plainText.lines().count { it == "https://webbudget.example.com/login" }).isEqualTo(1)
    }

    @Test
    fun `should render the blocked account in both languages, without a button`() {

        val portuguese = render("pt-BR", template = "account-blocked")

        assertThat(portuguese).contains("<html lang=\"pt-BR\"", "Conta bloqueada", "Sua conta foi bloqueada", "#ffe9e5", "#bd3931")
        assertThat(portuguese).contains("Olá, Maria Souza. Um administrador bloqueou sua conta", "As sessões abertas foram encerradas")
        assertThat(portuguese).contains("Seus dados continuam guardados.")
        assertThat(portuguese).contains("Você recebe este e-mail porque tem uma conta no webBudget.", "Enviado automaticamente pelo webBudget")
        assertThat(portuguese).doesNotContain("Entrar no webBudget", "/login", "Se o botão não funcionar")
        assertCleanOutput(portuguese)

        val english = render("en-US", template = "account-blocked")

        assertThat(english).contains("<html lang=\"en-US\"", "Account blocked", "Your account was blocked")
        assertThat(english).contains("Hi Maria Souza. An administrator blocked your webBudget account.", "Your data is still kept.")
        assertThat(english).contains("You’re getting this email because you have a webBudget account.")
        assertThat(english).doesNotContain("Sign in to webBudget", "/login")
        assertCleanOutput(english)
    }

    @Test
    fun `should render the unblocked account in both languages, with the sign-in button`() {

        val portuguese = render("pt-BR", template = "account-unblocked")

        assertThat(portuguese).contains("<html lang=\"pt-BR\"", "Conta desbloqueada", "Sua conta foi desbloqueada", "#d9f3e2", "#0b7643")
        assertThat(portuguese).contains("Olá, Maria Souza. Um administrador desbloqueou sua conta", "com o mesmo e-mail e a mesma senha")
        assertThat(portuguese).contains("Entrar no webBudget", "href=\"https://webbudget.example.com/login\"")
        assertThat(portuguese).contains("Você recebe este e-mail porque tem uma conta no webBudget.")
        assertCleanOutput(portuguese)

        val english = render("en-US", template = "account-unblocked")

        assertThat(english).contains("<html lang=\"en-US\"", "Account unblocked", "Your account was unblocked")
        assertThat(english).contains("Hi Maria Souza. An administrator unblocked your webBudget account.", "Sign in to webBudget")
        assertThat(english).contains("You’re getting this email because you have a webBudget account.")
        assertCleanOutput(english)
    }

    @Test
    fun `should make the plain text of the blocked and unblocked accounts`() {

        val blocked = MailPlainText.from(render("pt-BR", template = "account-blocked"))
        val unblocked = MailPlainText.from(render("en-US", template = "account-unblocked"))

        assertThat(blocked).contains("Conta bloqueada", "Sua conta foi bloqueada", "Seus dados continuam guardados.")
        assertThat(blocked).doesNotContain("●", "<")
        assertThat(unblocked).contains("Account unblocked", "Sign in to webBudget: https://webbudget.example.com/login")
        assertThat(unblocked).doesNotContain("●", "<")
    }

    private fun renderNotice(template: String, locale: String, variables: Map<String, Any>): String {

        val context = Context(Locale.forLanguageTag(locale)).apply {
            setVariable("subject", "Assunto do e-mail")
            setVariable("preheader", "Texto de pré-cabeçalho")
            setVariable("applicationUrl", "https://webbudget.example.com")
            setVariable("userName", "Maria Souza")
            setVariables(variables)
        }

        return engine.process(template, context)
    }

    private val passwordChangedVariables = mapOf(
        "changedAt" to "20/11/2026 às 14:32",
        "recoverUrl" to "https://webbudget.example.com/auth/forgot-password"
    )

    @Test
    fun `should render the password changed notice for both origins in both languages`() {

        val byRecovery = renderNotice("password-changed", "pt-BR", passwordChangedVariables + ("changedBy" to "RECOVERY"))

        assertThat(byRecovery).contains("<html lang=\"pt-BR\"", "Segurança", "Sua senha foi alterada", "Olá, Maria Souza.")
        assertThat(byRecovery).contains("Quando", "20/11/2026 às 14:32", "Como", "Pela recuperação de senha", "Foi você? Então está tudo certo.")
        assertThat(byRecovery).contains("Não reconhece a alteração?", "Recuperar acesso", "href=\"https://webbudget.example.com/auth/forgot-password\"")
        assertThat(byRecovery).contains("Você recebe este aviso sempre que algo muda na segurança da sua conta.")
        assertCleanOutput(byRecovery)

        val byAdministrator = renderNotice("password-changed", "pt-BR", passwordChangedVariables + ("changedBy" to "ADMINISTRATOR"))

        assertThat(byAdministrator).contains("Por um administrador", "Foi um administrador que definiu a senha nova.")
        assertThat(byAdministrator).doesNotContain("Pela recuperação de senha", "Foi você?")
        assertCleanOutput(byAdministrator)

        val english = renderNotice("password-changed", "en-US", passwordChangedVariables + ("changedBy" to "RECOVERY"))

        assertThat(english).contains("<html lang=\"en-US\"", "Security", "Your password was changed", "Hi Maria Souza.")
        assertThat(english).contains("Through password recovery", "Was it you? Then all is well.", "Recover access")
        assertThat(english).contains("You get this notice whenever something changes in your account’s security.")
        assertCleanOutput(english)

        val englishByAdministrator = renderNotice("password-changed", "en-US", passwordChangedVariables + ("changedBy" to "ADMINISTRATOR"))

        assertThat(englishByAdministrator).contains("By an administrator", "An administrator set the new password.")
        assertCleanOutput(englishByAdministrator)
    }

    @Test
    fun `should render the password changed notice for a change made by the user in both languages`() {

        val pt = renderNotice("password-changed", "pt-BR", passwordChangedVariables + ("changedBy" to "USER"))

        assertThat(pt).contains("Por você, em Minha conta", "Foi você? Então está tudo certo. As outras sessões abertas foram encerradas.")
        assertThat(pt).doesNotContain("Pela recuperação de senha", "Por um administrador")
        assertCleanOutput(pt)

        val english = renderNotice("password-changed", "en-US", passwordChangedVariables + ("changedBy" to "USER"))

        assertThat(english).contains("By you, in My account", "Was it you? Then you’re all set. Your other open sessions were signed out.")
        assertCleanOutput(english)
    }

    @Test
    fun `should render the two-step verification reset notice in both languages`() {

        val variables = mapOf("loginUrl" to "https://webbudget.example.com/login")

        val portuguese = renderNotice("totp-reset", "pt-BR", variables)

        assertThat(portuguese).contains("<html lang=\"pt-BR\"", "Verificação em duas etapas redefinida", "Olá, Maria Souza.")
        assertThat(portuguese).contains("Os dispositivos confiáveis também foram esquecidos.", "QR code")
        assertThat(portuguese).contains("Entrar no webBudget", "href=\"https://webbudget.example.com/login\"", "Não pediu isso?", "Avise um administrador.")
        assertCleanOutput(portuguese)

        val english = renderNotice("totp-reset", "en-US", variables)

        assertThat(english).contains("<html lang=\"en-US\"", "Two-step verification reset", "Hi Maria Souza.", "Your trusted devices were forgotten too.")
        assertThat(english).contains("Sign in to webBudget", "Didn’t ask for this?", "Tell an administrator.")
        assertCleanOutput(english)
    }

    @Test
    fun `should render the linked Google account notice in both languages`() {

        val variables = mapOf("linkedAt" to "20/11/2026 às 14:32", "userEmail" to "maria.souza@example.com")

        val portuguese = renderNotice("google-linked", "pt-BR", variables)

        assertThat(portuguese).contains("<html lang=\"pt-BR\"", "Conta Google vinculada", "Olá, Maria Souza.")
        assertThat(portuguese).contains("Quando", "20/11/2026 às 14:32", "Conta Google", "maria.souza@example.com", "Não reconhece?")
        assertThat(portuguese).doesNotContain("Se o botão não funcionar", "Entrar no webBudget", "Recuperar acesso")
        assertCleanOutput(portuguese)

        val english = renderNotice("google-linked", "en-US", variables.plus("linkedAt" to "Nov 20, 2026, 2:32 PM"))

        assertThat(english).contains("<html lang=\"en-US\"", "Google account linked", "Hi Maria Souza.")
        assertThat(english).contains("When", "Nov 20, 2026, 2:32 PM", "Google account", "Don’t recognize this?", "Tell an administrator.")
        assertThat(english).doesNotContain("If the button doesn’t work", "Sign in to webBudget", "Recover access")
        assertCleanOutput(english)
    }

    @Test
    fun `should escape the name of the owner in the notices`() {

        val html = renderNotice("totp-reset", "pt-BR", mapOf("loginUrl" to "https://webbudget.example.com/login", "userName" to "<b>x</b>"))

        assertThat(html).contains("&lt;b&gt;x&lt;/b&gt;").doesNotContain("<b>x</b>")
    }


    @Test
    fun `should render the due date notices in both languages with one row per movement`() {

        val lines = listOf(
            DueLine("10/12  Aluguel", "R$ 1.200,50", "expense"),
            DueLine("10/12  Salário", "R$ 8.000,00", "income")
        )

        fun renderNotice(template: String, locale: String): String {

            val context = Context(Locale.forLanguageTag(locale)).apply {
                setVariable("subject", "Assunto do e-mail")
                setVariable("preheader", "Texto de pré-cabeçalho")
                setVariable("applicationUrl", "https://webbudget.example.com")
                setVariable("userName", "Maria Souza")
                setVariable("lines", lines)
                setVariable("from", "09/12/2024")
                setVariable("to", "15/12/2024")
                setVariable("movementsUrl", "https://webbudget.example.com/financeiro/movimentos")
            }

            return engine.process(template, context)
        }

        val daily = renderNotice("due-date-daily", "pt-BR")

        assertThat(daily).contains("<html lang=\"pt-BR\"", "Vencimentos de hoje", "Olá, Maria Souza. Estes movimentos em aberto vencem hoje.")
        assertThat(daily).contains("10/12  Aluguel", "R$ 1.200,50", "10/12  Salário", "R$ 8.000,00", "Abrir os movimentos")
        assertThat(daily).doesNotContain("− R$", "+ R$")
        assertThat(daily).containsPattern("color: #bd3931;\"[^>]*>R\\$ 1\\.200,50<")
        assertThat(daily).containsPattern("color: #0b7643;\"[^>]*>R\\$ 8\\.000,00<")
        assertThat(daily).contains("href=\"https://webbudget.example.com/financeiro/movimentos\"", "Você recebe estes avisos porque eles estão ligados no seu perfil.")
        assertCleanOutput(daily)

        val weekly = renderNotice("due-date-weekly", "pt-BR")

        assertThat(weekly).contains("Vencimentos da próxima semana", "vencem de 09/12/2024 a 15/12/2024", "10/12  Aluguel")
        assertCleanOutput(weekly)

        val english = renderNotice("due-date-daily", "en-US")

        assertThat(english).contains("<html lang=\"en-US\"", "Due today", "Hi Maria Souza. These open movements are due today.", "Open the movements")
        assertThat(english).contains("You’re getting these notices because they’re turned on in your profile.")
        assertCleanOutput(english)

        val englishWeekly = renderNotice("due-date-weekly", "en-US")

        assertThat(englishWeekly).contains("Due next week", "are due from 09/12/2024 to 15/12/2024")
        assertCleanOutput(englishWeekly)

        val plainText = MailPlainText.from(daily)

        assertThat(plainText).doesNotContain("− R$", "+ R$")
        assertThat(plainText).contains("10/12 Aluguel: R$ 1.200,50", "10/12 Salário: R$ 8.000,00", "Abrir os movimentos: https://webbudget.example.com/financeiro/movimentos")
    }

    @Test
    fun `should render the test e-mail in both languages, without a button`() {

        val portuguese = render("pt-BR", template = "mail-test")

        assertThat(portuguese).contains("<html lang=\"pt-BR\"", "O envio de e-mails está funcionando", "O e-mail de teste do webBudget chegou.")
        assertThat(portuguese).contains("Você recebe este e-mail porque um administrador mandou um teste para este endereço.")
        assertThat(portuguese).doesNotContain("Entrar no webBudget", "/login")
        assertCleanOutput(portuguese)

        val english = render("en-US", template = "mail-test")

        assertThat(english).contains("<html lang=\"en-US\"", "Email sending is working", "The webBudget test email arrived.")
        assertCleanOutput(english)
    }

    private fun assertCleanOutput(html: String) {
        assertThat(html).doesNotContainPattern("\\sth:[a-z-]+=")
        assertThat(html).doesNotContain("#{", "??", "\${")
    }
}
