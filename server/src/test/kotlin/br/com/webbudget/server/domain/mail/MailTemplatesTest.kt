package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.infrastructure.config.MailTemplateConfiguration
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.thymeleaf.context.Context
import java.util.Locale

class MailTemplatesTest {

    private val configuration = MailTemplateConfiguration()

    private val engine = configuration.mailTemplateEngine(configuration.mailMessageSource())

    private fun render(locale: String, userName: String = "Maria Souza"): String {

        val context = Context(Locale.forLanguageTag(locale)).apply {
            setVariable("subject", "Assunto do e-mail")
            setVariable("preheader", "Texto de pré-cabeçalho")
            setVariable("applicationUrl", "https://webbudget.example.com")
            setVariable("loginUrl", "https://webbudget.example.com/login")
            setVariable("userName", userName)
            setVariable("userEmail", "maria.souza@example.com")
            setVariable("roles", "Financeiro, Cadastros")
        }

        return engine.process("account-approved", context)
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

    private fun assertCleanOutput(html: String) {
        assertThat(html).doesNotContainPattern("\\sth:[a-z-]+=")
        assertThat(html).doesNotContain("#{", "??", "\${")
    }
}
