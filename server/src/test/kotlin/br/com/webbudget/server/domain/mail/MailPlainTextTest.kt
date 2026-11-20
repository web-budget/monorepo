package br.com.webbudget.server.domain.mail

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class MailPlainTextTest {

    @Test
    fun `should drop the head, styles and tags and keep one blank line between blocks`() {

        val html = """
            <!DOCTYPE html>
            <html>
            <head><title>Assunto</title><style>p { color: red; }</style></head>
            <body>
                <table><tr><td>web<span style="color: #0c6944;">Budget</span></td></tr></table>


                <h1>Título</h1>
                <p>Primeira   linha<br/>segunda linha</p>
            </body>
            </html>
        """.trimIndent()

        assertThat(MailPlainText.from(html)).isEqualTo("webBudget\n\nTítulo\n\nPrimeira linha\nsegunda linha")
    }

    @Test
    fun `should write a labelled link as label and address and a bare link once`() {

        val html = """<p><a href="https://webbudget.example.com/login" style="color: #fff;"><span>Entrar</span> no webBudget</a></p>""" +
                """<p><a href="https://webbudget.example.com">https://webbudget.example.com</a></p>""" +
                """<p><a href="https://webbudget.example.com/vazio"></a></p>""" +
                """<p><a href="https://webbudget.example.com/a?b=1&amp;c=2">https://webbudget.example.com/a?b=1&amp;c=2</a></p>"""

        assertThat(MailPlainText.from(html)).isEqualTo(
            "Entrar no webBudget: https://webbudget.example.com/login\n" +
                    "https://webbudget.example.com\n" +
                    "https://webbudget.example.com/vazio\n" +
                    "https://webbudget.example.com/a?b=1&c=2"
        )
    }

    @Test
    fun `should decode named and numeric entities`() {

        val html = "<p>A &amp; B &lt;tag&gt; &quot;aspas&quot; &#39;simples&#39; &apos;x&apos;&nbsp;fim &#233; &#xE7;&#8203;</p>"

        assertThat(MailPlainText.from(html)).isEqualTo("A & B <tag> \"aspas\" 'simples' 'x' fim é ç")
    }

    @Test
    fun `should not decode an escaped entity twice`() {
        assertThat(MailPlainText.from("<p>&amp;lt;</p>")).isEqualTo("&lt;")
    }

    @Test
    fun `should leave out every element hidden from assistive technology`() {

        val html = """
            <div aria-hidden="true" style="display:none">Pré-cabeçalho escondido</div>
            <table><tr><td aria-hidden="true">wB<div>barra</div></td><td>web<span>Budget</span></td></tr></table>
            <p><span aria-hidden="true">&#9679;</span>&nbsp;Conta aprovada</p>
        """.trimIndent()

        assertThat(MailPlainText.from(html)).isEqualTo("webBudget\n\nConta aprovada")
    }

    @Test
    fun `should end a ledger label with a colon and separate the cells of a row`() {

        val html = """
            <table>
              <tr><td class="wb-ledger-label" style="width:38%">E-mail de acesso</td><td class="wb-ledger-value"><span>maria@example.com</span></td></tr>
              <tr><td class="wb-ledger-label">Áreas liberadas</td><td class="wb-ledger-value">Financeiro, Cadastros</td></tr>
            </table>
        """.trimIndent()

        assertThat(MailPlainText.from(html))
            .isEqualTo("E-mail de acesso: maria@example.com\nÁreas liberadas: Financeiro, Cadastros")
    }

    @Test
    fun `should separate adjacent cells that are not a ledger with a space`() {
        assertThat(MailPlainText.from("<table><tr><td>um</td><td>dois</td></tr></table>")).isEqualTo("um dois")
    }
}
