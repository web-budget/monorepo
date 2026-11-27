package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.OfxStatementType
import br.com.webbudget.server.domain.entities.financial.OfxTransactionKind
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.INVALID_OFX_FILE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.UNSUPPORTED_OFX_TYPE
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate

class OfxReaderTest {

    private val reader = OfxReader()

    @Test
    fun `should read a credit card statement`() {

        val statement = reader.read(resource("card-statement.ofx"))

        assertThat(statement.type).isEqualTo(OfxStatementType.CREDIT_CARD)
        assertThat(statement.startedOn).isEqualTo(LocalDate.of(2026, 11, 1))
        assertThat(statement.endedOn).isEqualTo(LocalDate.of(2026, 11, 30))
        assertThat(statement.ledgerBalance?.amount).isEqualByComparingTo("-1365.40")
        assertThat(statement.ledgerBalance?.asOf).isEqualTo(LocalDate.of(2026, 11, 30))
        assertThat(statement.transactions).hasSize(7)
    }

    @Test
    fun `should keep the sign, the cents and only the date of each line`() {

        val transactions = reader.read(resource("card-statement.ofx")).transactions

        assertThat(transactions[0].postedOn).isEqualTo(LocalDate.of(2026, 10, 31))
        assertThat(transactions[0].amount).isEqualTo(BigDecimal("-39.90"))
        assertThat(transactions[0].isCredit).isFalse()
        assertThat(transactions[0].type).isEqualTo("DEBIT")
        assertThat(transactions[5].amount).isEqualTo(BigDecimal("1500.00"))
        assertThat(transactions[5].isCredit).isTrue()
        assertThat(transactions[6].amount).isEqualByComparingTo("-1200.00")
    }

    @Test
    fun `should decode utf-8 files with accents and entities`() {

        val transaction = reader.read(resource("card-statement.ofx")).transactions[1]

        assertThat(transaction.memo).isEqualTo("Padaria São João & Café")
        assertThat(transaction.name).isEqualTo("Padaria São João & Café")
    }

    @Test
    fun `should decode windows-1252 files with accents`() {

        val transaction = reader.read(resource("account-statement.ofx")).transactions[1]

        assertThat(transaction.memo).startsWith("Transferência recebida pelo Pix - EMPRESA FICTÍCIA LTDA")
        assertThat(transaction.memo).contains("Agência")
    }

    @Test
    fun `should split the installment from the name`() {

        val transactions = reader.read(resource("card-statement.ofx")).transactions

        assertThat(transactions[0].name).isEqualTo("Streaming Exemplo")
        assertThat(transactions[0].installment).isEqualTo(1)
        assertThat(transactions[0].installments).isEqualTo(3)
        assertThat(transactions[6].name).isEqualTo("Celular Novo Exemplo")
        assertThat(transactions[6].installment).isEqualTo(10)
        assertThat(transactions[6].installments).isEqualTo(12)
        assertThat(transactions[1].installment).isNull()
        assertThat(transactions[1].installments).isNull()
    }

    @Test
    fun `should identify the special lines of the card`() {

        val transactions = reader.read(resource("card-statement.ofx")).transactions

        assertThat(transactions.map { it.kind }).containsExactly(
            OfxTransactionKind.REGULAR,
            OfxTransactionKind.REGULAR,
            OfxTransactionKind.REGULAR,
            OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE,
            OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE_REFUND,
            OfxTransactionKind.PAYMENT_RECEIVED,
            OfxTransactionKind.REGULAR
        )
    }

    @Test
    fun `should tell apart lines that repeat the fit id by the value and description`() {

        val transactions = reader.read(resource("card-statement.ofx")).transactions

        assertThat(transactions[2].fitId).isEqualTo(transactions[3].fitId)
        assertThat(transactions[2].identity).isNotEqualTo(transactions[3].identity)
        assertThat(transactions.map { it.identity }.toSet()).hasSize(transactions.size)
        assertThat(transactions[0].identity.amount).isEqualTo(BigDecimal("-39.9"))
    }

    @Test
    fun `should read a bank account statement`() {

        val statement = reader.read(resource("account-statement.ofx"))

        assertThat(statement.type).isEqualTo(OfxStatementType.BANK_ACCOUNT)
        assertThat(statement.ledgerBalance?.amount).isEqualByComparingTo("1250.01")
        assertThat(statement.transactions).hasSize(7)
        assertThat(statement.transactions[0].amount).isEqualByComparingTo("-50.25")
        assertThat(statement.transactions[1].amount).isEqualByComparingTo("3000.00")
    }

    @Test
    fun `should derive the name from each account pattern`() {

        val names = reader.read(resource("account-statement.ofx")).transactions.map { it.name }

        assertThat(names).containsExactly(
            "MARIA FICTÍCIA DA SILVA",
            "EMPRESA FICTÍCIA LTDA",
            "JOÃO EXEMPLO",
            "ENERGIA FICTÍCIA S.A.",
            "ANA EXEMPLO",
            "Pagamento de fatura",
            "Compra no débito - Mercado Exemplo"
        )
    }

    @Test
    fun `should identify the invoice payment of the account`() {

        val transactions = reader.read(resource("account-statement.ofx")).transactions

        assertThat(transactions.map { it.kind }).containsExactly(
            OfxTransactionKind.REGULAR,
            OfxTransactionKind.REGULAR,
            OfxTransactionKind.REGULAR,
            OfxTransactionKind.REGULAR,
            OfxTransactionKind.REGULAR,
            OfxTransactionKind.INVOICE_PAYMENT,
            OfxTransactionKind.REGULAR
        )
    }

    @Test
    fun `should keep the derived name within the limit of the movements`() {

        val longName = "A".repeat(200)
        val content = card("<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261101<TRNAMT>-1.00<FITID>1<MEMO>$longName</STMTTRN>")

        assertThat(reader.read(content.toByteArray()).transactions.single().name).hasSize(OfxReader.NAME_MAX_LENGTH)
    }

    @Test
    fun `should use the name field when the memo is missing and a statement without optional blocks`() {

        val content = card("<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261101<TRNAMT>-1.00<FITID>1<NAME>Loja Exemplo</STMTTRN>")
            .replace("<DTSTART>20261101\n", "")

        val statement = reader.read(content.toByteArray())

        assertThat(statement.transactions.single().memo).isEqualTo("Loja Exemplo")
        assertThat(statement.startedOn).isNull()
        assertThat(statement.ledgerBalance).isNull()
    }

    @Test
    fun `should read a ledger balance without a date`() {

        val content = card("<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261101<TRNAMT>-1.00<FITID>1<MEMO>X</STMTTRN>")
            .replace("</BANKTRANLIST>", "</BANKTRANLIST><LEDGERBAL><BALAMT>-1.00</LEDGERBAL>")

        assertThat(reader.read(content.toByteArray()).ledgerBalance?.asOf).isNull()
    }

    @Test
    fun `should refuse a file that is not an ofx`() {

        assertThatThrownBy { reader.read(resource("not-an-ofx.txt")) }
            .isInstanceOf(DomainException::class.java)
            .hasFieldOrPropertyWithValue("error", INVALID_OFX_FILE)

        assertThatThrownBy { reader.read(ByteArray(0)) }
            .isInstanceOf(DomainException::class.java)
            .hasFieldOrPropertyWithValue("error", INVALID_OFX_FILE)
    }

    @Test
    fun `should refuse an ofx of another type`() {

        assertThatThrownBy { reader.read(resource("investment-statement.ofx")) }
            .isInstanceOf(DomainException::class.java)
            .hasFieldOrPropertyWithValue("error", UNSUPPORTED_OFX_TYPE)
    }

    @Test
    fun `should refuse a line with missing or malformed fields`() {

        listOf(
            "<STMTTRN><TRNTYPE>DEBIT<TRNAMT>-1.00<FITID>1<MEMO>X</STMTTRN>",
            "<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261101<FITID>1<MEMO>X</STMTTRN>",
            "<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261101<TRNAMT>-1.00<MEMO>X</STMTTRN>",
            "<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261101<TRNAMT>-1.00<FITID>1</STMTTRN>",
            "<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>2026ABCD<TRNAMT>-1.00<FITID>1<MEMO>X</STMTTRN>",
            "<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261101<TRNAMT>abc<FITID>1<MEMO>X</STMTTRN>"
        ).forEach { line ->
            assertThatThrownBy { reader.read(card(line).toByteArray()) }
                .isInstanceOf(DomainException::class.java)
                .hasFieldOrPropertyWithValue("error", INVALID_OFX_FILE)
        }
    }

    private fun card(transactions: String) = """
        OFXHEADER:100
        ENCODING:UTF-8

        <OFX>
        <CREDITCARDMSGSRSV1>
        <CCSTMTTRNRS>
        <CCSTMTRS>
        <BANKTRANLIST>
        <DTSTART>20261101
        <DTEND>20261130
        $transactions
        </BANKTRANLIST>
        </CCSTMTRS>
        </CCSTMTTRNRS>
        </CREDITCARDMSGSRSV1>
        </OFX>
    """.trimIndent()

    private fun resource(name: String): ByteArray = requireNotNull(javaClass.getResourceAsStream("/ofx/$name")).readBytes()
}
