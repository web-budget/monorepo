package br.com.webbudget.server.domain.mail

object MailPlainText {

    private val INVISIBLE_BLOCKS = Regex("<(head|style|script)\\b[^>]*>.*?</\\1>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
    private val HIDDEN_ELEMENTS = Regex("<(\\w+)\\b[^>]*aria-hidden=\"true\"[^>]*>.*?</\\1>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
    private val LABEL_CELLS = Regex("(<td\\b[^>]*wb-ledger-label[^>]*>.*?)</td>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
    private val CELL_ENDS = Regex("</td>\\s*", RegexOption.IGNORE_CASE)
    private val ROW_GAPS = Regex("(</tr>)\\s+(?=<tr)", RegexOption.IGNORE_CASE)
    private val LINKS = Regex("<a\\b[^>]*?href=\"([^\"]*)\"[^>]*>(.*?)</a>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
    private val LINE_BREAKS = Regex("<br\\s*/?>|</(p|div|tr|table|h[1-6]|li)>", RegexOption.IGNORE_CASE)
    private val TAGS = Regex("<[^>]+>")
    private val NUMERIC_ENTITIES = Regex("&#(x[0-9a-fA-F]+|[0-9]+);")
    private val HORIZONTAL_WHITESPACE = Regex("[ \\t\\u00A0\\u200B]+")
    private val EXTRA_BLANK_LINES = Regex("\n{3,}")

    private val NAMED_ENTITIES = mapOf(
        "&nbsp;" to " ",
        "&lt;" to "<",
        "&gt;" to ">",
        "&quot;" to "\"",
        "&#39;" to "'",
        "&apos;" to "'"
    )

    fun from(html: String): String {
        val text = html
            .replace(INVISIBLE_BLOCKS, "")
            .replace(HIDDEN_ELEMENTS, "")
            .replace(LABEL_CELLS) { cell -> "${cell.groupValues[1]}: </td>" }
            .replace(CELL_ENDS, " </td>")
            .replace(ROW_GAPS, "$1")
            .replace(LINKS) { link -> describeLink(link.groupValues[1], link.groupValues[2]) }
            .replace(LINE_BREAKS, "\n")
            .replace(TAGS, "")

        return decodeEntities(text)
            .lines()
            .joinToString("\n") { line -> line.replace(HORIZONTAL_WHITESPACE, " ").trim() }
            .replace(EXTRA_BLANK_LINES, "\n\n")
            .trim()
    }

    private fun describeLink(href: String, innerHtml: String): String {
        val label = innerHtml.replace(TAGS, "").replace(HORIZONTAL_WHITESPACE, " ").trim()

        return if (label.isEmpty() || decodeEntities(label) == decodeEntities(href)) href else "$label: $href"
    }

    private fun decodeEntities(text: String): String {
        val withoutNamedEntities = NAMED_ENTITIES.entries.fold(text) { decoded, (entity, character) -> decoded.replace(entity, character) }

        return withoutNamedEntities
            .replace(NUMERIC_ENTITIES) { entity -> codePointOf(entity.groupValues[1]) }
            .replace("&amp;", "&")
    }

    private fun codePointOf(reference: String): String {
        val codePoint = if (reference.startsWith("x")) reference.substring(1).toInt(16) else reference.toInt()

        return String(Character.toChars(codePoint))
    }
}
