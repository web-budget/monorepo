package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.OfxLedgerBalance
import br.com.webbudget.server.domain.entities.financial.OfxStatement
import br.com.webbudget.server.domain.entities.financial.OfxStatementType
import br.com.webbudget.server.domain.entities.financial.OfxTransaction
import br.com.webbudget.server.domain.entities.financial.OfxTransactionKind
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_OFX_FILE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.UNSUPPORTED_OFX_TYPE
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.nio.charset.Charset
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

@Component
class OfxReader {

    fun read(content: ByteArray): OfxStatement {

        val startOfBody = indexOfBody(content)
        val header = parseHeader(String(content, 0, startOfBody, Charsets.ISO_8859_1))
        val body = String(content, startOfBody, content.size - startOfBody, charsetOf(header))

        val structure = mutableSetOf<String>()
        val statementFields = mutableMapOf<String, String>()
        val ledgerFields = mutableMapOf<String, String>()
        val transactionFields = mutableMapOf<String, String>()
        val transactions = mutableListOf<Map<String, String>>()

        var insideTransaction = false
        var insideLedger = false

        TOKEN.findAll(body).forEach { token ->

            val closing = token.groupValues[1].isNotEmpty()
            val name = token.groupValues[2].uppercase()
            val text = unescape(token.groupValues[3].trim())

            when {
                !closing && name == TRANSACTION -> {
                    insideTransaction = true
                    transactionFields.clear()
                }

                closing && name == TRANSACTION -> {
                    insideTransaction = false
                    transactions.add(transactionFields.toMap())
                }

                !closing && name == LEDGER -> insideLedger = true
                closing && name == LEDGER -> insideLedger = false
                !closing && text.isEmpty() -> structure.add(name)
                !closing -> when {
                    insideTransaction -> transactionFields[name] = text
                    insideLedger -> ledgerFields[name] = text
                    else -> statementFields[name] = text
                }
            }
        }

        val type = typeOf(structure)

        return OfxStatement(
            type = type,
            startedOn = statementFields[START_DATE]?.let(::parseDate),
            endedOn = statementFields[END_DATE]?.let(::parseDate),
            ledgerBalance = ledgerFields[BALANCE_AMOUNT]?.let {
                OfxLedgerBalance(parseAmount(it), ledgerFields[BALANCE_DATE]?.let(::parseDate))
            },
            transactions = transactions.map { toTransaction(it, type) }
        )
    }

    private fun indexOfBody(content: ByteArray): Int {

        val index = String(content, Charsets.ISO_8859_1).indexOf(OFX_ROOT, ignoreCase = true)

        if (index < 0) {
            throw invalidFile()
        }

        return index
    }

    private fun parseHeader(text: String): Map<String, String> = text.lineSequence()
        .map { it.trim() }
        .filter { it.contains(':') && !it.startsWith("<") }
        .associate { line ->
            line.substringBefore(':').trim().uppercase() to line.substringAfter(':').trim().uppercase()
        }

    private fun charsetOf(header: Map<String, String>): Charset = when {
        header[ENCODING] == UTF_8 || header[CHARSET] == UTF_8 -> Charsets.UTF_8
        else -> WINDOWS_1252
    }

    private fun typeOf(structure: Set<String>): OfxStatementType = when {
        structure.any { it == CREDIT_CARD_ENVELOPE || it == CREDIT_CARD_STATEMENT } -> OfxStatementType.CREDIT_CARD
        structure.any { it == BANK_ENVELOPE || it == BANK_STATEMENT } -> OfxStatementType.BANK_ACCOUNT
        else -> throw DomainException("The OFX file has an unsupported statement type", UNSUPPORTED_OFX_TYPE)
    }

    private fun toTransaction(fields: Map<String, String>, type: OfxStatementType): OfxTransaction {

        val postedOn = parseDate(fields[POSTED_DATE] ?: throw invalidFile())
        val amount = parseAmount(fields[AMOUNT] ?: throw invalidFile())
        val fitId = fields[FIT_ID] ?: throw invalidFile()
        val memo = (fields[MEMO] ?: fields[NAME] ?: throw invalidFile()).replace(WHITESPACE, " ")

        val installment = INSTALLMENT.matchEntire(memo)

        val name = when (type) {
            OfxStatementType.CREDIT_CARD -> installment?.groupValues?.get(1) ?: memo
            OfxStatementType.BANK_ACCOUNT -> accountName(memo)
        }

        return OfxTransaction(
            type = fields[TRANSACTION_TYPE],
            postedOn = postedOn,
            amount = amount,
            fitId = fitId,
            memo = memo,
            name = name.take(NAME_MAX_LENGTH),
            installment = installment?.groupValues?.get(2)?.toInt(),
            installments = installment?.groupValues?.get(3)?.toInt(),
            kind = kindOf(memo, type)
        )
    }

    private fun accountName(memo: String): String {

        val prefix = ACCOUNT_NAME_PREFIXES.firstOrNull { memo.startsWith(it, ignoreCase = true) } ?: return memo

        return memo.substring(prefix.length)
            .substringBefore(NAME_SEPARATOR)
            .replace(SENT_MARKER, "")
            .trim()
            .ifEmpty { memo }
    }

    private fun kindOf(memo: String, type: OfxStatementType): OfxTransactionKind = when (type) {
        OfxStatementType.CREDIT_CARD -> when {
            memo.startsWith(PAYMENT_RECEIVED, ignoreCase = true) -> OfxTransactionKind.PAYMENT_RECEIVED
            memo.startsWith(INTERNATIONAL_FEE, ignoreCase = true) -> OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE
            memo.startsWith(INTERNATIONAL_FEE_REFUND, ignoreCase = true) ->
                OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE_REFUND

            else -> OfxTransactionKind.REGULAR
        }

        OfxStatementType.BANK_ACCOUNT ->
            if (INVOICE_PAYMENT_PREFIXES.any { memo.startsWith(it, ignoreCase = true) }) {
                OfxTransactionKind.INVOICE_PAYMENT
            } else {
                OfxTransactionKind.REGULAR
            }
    }

    private fun parseDate(text: String): LocalDate = try {
        LocalDate.parse(text.take(DATE_LENGTH), DateTimeFormatter.BASIC_ISO_DATE)
    } catch (_: DateTimeParseException) {
        throw invalidFile()
    }

    private fun parseAmount(text: String): BigDecimal = try {
        BigDecimal(if (text.contains('.')) text else text.replace(',', '.'))
    } catch (_: NumberFormatException) {
        throw invalidFile()
    }

    private fun unescape(text: String): String = text
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&amp;", "&")

    private fun invalidFile() = DomainException("The file is not a valid OFX statement", INVALID_OFX_FILE)

    companion object {

        const val NAME_MAX_LENGTH = 150

        private const val OFX_ROOT = "<OFX>"
        private const val TRANSACTION = "STMTTRN"
        private const val LEDGER = "LEDGERBAL"
        private const val START_DATE = "DTSTART"
        private const val END_DATE = "DTEND"
        private const val BALANCE_AMOUNT = "BALAMT"
        private const val BALANCE_DATE = "DTASOF"
        private const val TRANSACTION_TYPE = "TRNTYPE"
        private const val POSTED_DATE = "DTPOSTED"
        private const val AMOUNT = "TRNAMT"
        private const val FIT_ID = "FITID"
        private const val MEMO = "MEMO"
        private const val NAME = "NAME"
        private const val CREDIT_CARD_ENVELOPE = "CREDITCARDMSGSRSV1"
        private const val CREDIT_CARD_STATEMENT = "CCSTMTRS"
        private const val BANK_ENVELOPE = "BANKMSGSRSV1"
        private const val BANK_STATEMENT = "STMTRS"
        private const val ENCODING = "ENCODING"
        private const val CHARSET = "CHARSET"
        private const val UTF_8 = "UTF-8"
        private const val DATE_LENGTH = 8
        private const val NAME_SEPARATOR = " - "
        private const val PAYMENT_RECEIVED = "Pagamento recebido"
        private const val INTERNATIONAL_FEE = "IOF de compra internacional"
        private const val INTERNATIONAL_FEE_REFUND = "IOF de volta"

        private val WINDOWS_1252 = Charset.forName("windows-1252")
        private val TOKEN = Regex("<(/?)([A-Za-z0-9_.]+)>([^<]*)")
        private val WHITESPACE = Regex("\\s+")
        private val INSTALLMENT = Regex("^(.*?)\\s*-\\s*Parcela\\s+(\\d+)/(\\d+)$", RegexOption.IGNORE_CASE)
        private val SENT_MARKER = Regex("\\s+\\(Transferência enviada\\)", RegexOption.IGNORE_CASE)

        private val ACCOUNT_NAME_PREFIXES = listOf(
            "Transferência enviada pelo Pix - ",
            "Transferência recebida pelo Pix - ",
            "Transferência Recebida - ",
            "Pagamento de boleto efetuado - "
        )

        private val INVOICE_PAYMENT_PREFIXES = listOf("Pagamento de fatura", "Pagamento da fatura")
    }
}
