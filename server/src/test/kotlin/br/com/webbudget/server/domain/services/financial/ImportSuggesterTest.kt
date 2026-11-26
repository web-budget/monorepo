package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.CardReference
import br.com.webbudget.server.domain.entities.financial.ClassificationReference
import br.com.webbudget.server.domain.entities.financial.CostCenterReference
import br.com.webbudget.server.domain.entities.financial.FinancialPeriodReference
import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportCandidate
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.ImportNameMemory
import br.com.webbudget.server.domain.entities.financial.ImportSuggestionContext
import br.com.webbudget.server.domain.entities.financial.ImportedLine
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.OfxTransaction
import br.com.webbudget.server.domain.entities.financial.OfxTransactionKind
import br.com.webbudget.server.domain.entities.financial.WalletReference
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class ImportSuggesterTest {

    private val suggester = ImportSuggester()

    private val period = FinancialPeriodReference(
        1, UUID.randomUUID(), "Period", LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), FinancialPeriodReference.Status.OPEN
    )
    private val card = CardReference(1, UUID.randomUUID(), "Card", "1234", true, 10)
    private val wallet = WalletReference(1, UUID.randomUUID(), "Wallet", true, BigDecimal("100.00"))
    private val otherWallet = WalletReference(2, UUID.randomUUID(), "Other wallet", true, BigDecimal.ZERO)
    private val inactiveWallet = WalletReference(3, UUID.randomUUID(), "Inactive wallet", false, BigDecimal.ZERO)
    private val costCenter = CostCenterReference(1, UUID.randomUUID(), "Home", "Home", true)
    private val expenseClassification = ClassificationReference(1, UUID.randomUUID(), "Market", "EXPENSE", true)
    private val incomeClassification = ClassificationReference(2, UUID.randomUUID(), "Salary", "INCOME", true)

    private val cardImport = Import(period, card, null, "card.ofx")
    private val walletImport = Import(period, null, wallet, "account.ofx")

    @Test
    fun `should ignore the lines imported before by identity or, in the card, by date, value and name`() {

        val context = context(
            importedBefore = listOf(
                ImportedLine("a", BigDecimal("-10.00"), "Shop one", LocalDate.of(2026, 11, 1), "Shop one"),
                ImportedLine("other", BigDecimal("-20.00"), "Shop two old", LocalDate.of(2026, 11, 2), "Shop two")
            )
        )

        val cardLines = suggester.suggest(
            cardImport,
            listOf(
                transaction("a", "-10.0", "Shop one"),
                transaction("changed", "-20.00", "Shop two", date = LocalDate.of(2026, 11, 2)),
                transaction("changed", "-20.00", "Shop two", date = LocalDate.of(2026, 11, 3))
            ),
            context
        )

        assertThat(cardLines.map { it.alreadyImported }).containsExactly(true, true, false)
        assertThat(cardLines.map { it.action }).containsExactly(ImportAction.IGNORE, ImportAction.IGNORE, ImportAction.CREATE)

        val walletLines = suggester.suggest(
            walletImport,
            listOf(
                transaction("changed", "-20.00", "Shop two", date = LocalDate.of(2026, 11, 2)),
                transaction("a", "-10.00", "Shop one")
            ),
            context
        )

        assertThat(walletLines.map { it.alreadyImported }).containsExactly(false, true)
    }

    @Test
    fun `should always ignore a credit in the card and the paired international fees`() {

        val lines = suggester.suggest(
            cardImport,
            listOf(
                transaction("1", "1500.00", "Pagamento recebido", kind = OfxTransactionKind.PAYMENT_RECEIVED),
                transaction("2", "-3.50", "IOF de compra internacional", kind = OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE),
                transaction("3", "3.50", "IOF de volta de loja", kind = OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE_REFUND),
                transaction("4", "-9.00", "IOF de compra internacional", kind = OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE),
                transaction("5", "59.90", "Estorno loja"),
                transaction("6", "-12.00", "IOF de compra internacional", kind = OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE),
                transaction("7", "12.00", "IOF de volta de loja", kind = OfxTransactionKind.INTERNATIONAL_PURCHASE_FEE_REFUND)
            ),
            context()
        )

        assertThat(lines.map { it.action }).containsExactly(
            ImportAction.IGNORE,
            ImportAction.IGNORE,
            ImportAction.IGNORE,
            ImportAction.CREATE,
            ImportAction.IGNORE,
            ImportAction.IGNORE,
            ImportAction.IGNORE
        )
        assertThat(lines.map { it.position }).containsExactly(1, 2, 3, 4, 5, 6, 7)
    }

    @Test
    fun `should link an installment to the open movement launched by a recurring of the card with the same value and installment`() {

        val movement = movement(10, "Phone 3/12", "249.90", recurringId = 5, recurringCardId = 1, installment = 3, installments = 12)

        val lines = suggester.suggest(
            cardImport,
            listOf(
                transaction("1", "-249.90", "Phone", installment = 3, installments = 12),
                transaction("2", "-249.90", "Phone", installment = 3, installments = 12),
                transaction("3", "-249.00", "Phone", installment = 3, installments = 12)
            ),
            context(movements = listOf(movement))
        )

        assertThat(lines[0].action).isEqualTo(ImportAction.LINK)
        assertThat(lines[0].link).isSameAs(movement)
        assertThat(lines[0].differentValue).isFalse()
        assertThat(lines[1].action).isEqualTo(ImportAction.CREATE_RECURRING)
        assertThat(lines[2].action).isEqualTo(ImportAction.CREATE_RECURRING)
    }

    @Test
    fun `should link a line without installments to a recurring without installments by value and name`() {

        val movement = movement(10, "Streaming", "39.90", recurringId = 5, recurringCardId = 1)
        val otherCardMovement = movement(11, "Streaming", "39.90", recurringId = 6, recurringCardId = 99)

        val lines = suggester.suggest(
            cardImport,
            listOf(transaction("1", "-39.90", "STREAMING"), transaction("2", "-39.90", "Other name")),
            context(movements = listOf(otherCardMovement, movement))
        )

        assertThat(lines[0].action).isEqualTo(ImportAction.LINK)
        assertThat(lines[0].link).isSameAs(movement)
        assertThat(lines[1].action).isEqualTo(ImportAction.CREATE)
    }

    @Test
    fun `should link by the name memory to a recurring movement or to a purchase of the invoice`() {

        val movement = movement(10, "Insurance", "64.90", recurringId = 7, recurringCardId = null)
        val unrelated = movement(11, "Unrelated", "70.00", recurringId = null, recurringCardId = null)
        val purchase = candidate(ImportCandidateKind.PURCHASE, 20, "Restaurant", "214.60")

        val memories = memories(
            memory("Insurance co", ImportAction.LINK, recurringId = 7),
            memory("Restaurant", ImportAction.LINK, recurringId = null),
            memory("Unrelated shop", ImportAction.LINK, recurringId = null)
        )

        val lines = suggester.suggest(
            cardImport,
            listOf(
                transaction("1", "-64.90", "Insurance co"),
                transaction("2", "-214.60", "Restaurant"),
                transaction("3", "-70.00", "Unrelated shop"),
                transaction("4", "-1.00", "Insurance co")
            ),
            context(movements = listOf(unrelated, movement), purchases = listOf(purchase), memories = memories)
        )

        assertThat(lines[0].link).isSameAs(movement)
        assertThat(lines[0].fromMemory).isTrue()
        assertThat(lines[1].link).isSameAs(purchase)
        assertThat(lines[2].action).isEqualTo(ImportAction.CREATE)
        assertThat(lines[3].action).isEqualTo(ImportAction.CREATE)
    }

    @Test
    fun `should launch the recurring that matches the installment and value or create a recurring`() {

        val recurring = candidate(ImportCandidateKind.RECURRING, 30, "Glasses", "180.00", installment = 3, installments = 5)

        val lines = suggester.suggest(
            cardImport,
            listOf(
                transaction("1", "-180.00", "Glasses", installment = 3, installments = 5),
                transaction("2", "-95.00", "Shop", installment = 2, installments = 4),
                transaction("3", "-180.00", "Glasses", installment = 3, installments = 6),
                transaction("4", "-50.00", "Plain shop")
            ),
            context(
                recurringMovements = listOf(recurring),
                memories = memories(
                    ImportNameMemory(
                        Import.Target.CARD, ImportNameMemory.normalize("Shop"), ImportAction.CREATE, costCenter, incomeClassification, null, null
                    )
                )
            )
        )

        assertThat(lines[0].action).isEqualTo(ImportAction.LAUNCH_RECURRING)
        assertThat(lines[0].link).isSameAs(recurring)
        assertThat(lines[1].action).isEqualTo(ImportAction.CREATE_RECURRING)
        assertThat(lines[1].installment).isEqualTo(2)
        assertThat(lines[1].installments).isEqualTo(4)
        assertThat(lines[1].costCenter).isSameAs(costCenter)
        assertThat(lines[1].classification).isNull()
        assertThat(lines[2].action).isEqualTo(ImportAction.CREATE_RECURRING)
        assertThat(lines[3].action).isEqualTo(ImportAction.CREATE)
    }

    @Test
    fun `should fill the cost center and the classification of a created line from the memory`() {

        val lines = suggester.suggest(
            cardImport,
            listOf(transaction("1", "-10.00", "Market")),
            context(memories = memories(memory("Market", ImportAction.CREATE, recurringId = null)))
        )

        assertThat(lines[0].action).isEqualTo(ImportAction.CREATE)
        assertThat(lines[0].fromMemory).isTrue()
        assertThat(lines[0].costCenter).isSameAs(costCenter)
        assertThat(lines[0].classification).isSameAs(expenseClassification)
        assertThat(lines[0].pendingReasons()).isEmpty()
    }

    @Test
    fun `should suggest the invoice payment of the wallet and preselect the one with the same value`() {

        val small = candidate(ImportCandidateKind.MOVEMENT, 40, "Invoice small", "1169.00", invoicePayment = true)
        val exact = candidate(ImportCandidateKind.MOVEMENT, 41, "Invoice exact", "1873.22", invoicePayment = true)

        val lines = suggester.suggest(
            walletImport,
            listOf(
                transaction("1", "-1873.22", "Pagamento de fatura", kind = OfxTransactionKind.INVOICE_PAYMENT),
                transaction("2", "-1.00", "Pagamento de fatura", kind = OfxTransactionKind.INVOICE_PAYMENT),
                transaction("3", "50.00", "Pagamento de fatura", kind = OfxTransactionKind.INVOICE_PAYMENT)
            ),
            context(invoicePayments = listOf(small, exact))
        )

        assertThat(lines[0].action).isEqualTo(ImportAction.INVOICE_PAYMENT)
        assertThat(lines[0].link).isSameAs(exact)
        assertThat(lines[1].action).isEqualTo(ImportAction.INVOICE_PAYMENT)
        assertThat(lines[1].link).isNull()
        assertThat(lines[1].pendingReasons()).containsExactly(ImportLine.LINK)
        assertThat(lines[2].action).isEqualTo(ImportAction.CREATE)

        val withoutPayments = suggester.suggest(
            walletImport,
            listOf(transaction("1", "-1873.22", "Pagamento de fatura", kind = OfxTransactionKind.INVOICE_PAYMENT)),
            context()
        )

        assertThat(withoutPayments[0].action).isEqualTo(ImportAction.CREATE)
    }

    @Test
    fun `should link an income to an open income and an expense to an open expense of any period by the memory`() {

        val salary = movement(50, "Salary", "8400.00", recurringId = 8, type = Movement.Type.INCOME)
        val rent = movement(51, "Rent", "8400.00", recurringId = 9, type = Movement.Type.EXPENSE)

        val lines = suggester.suggest(
            walletImport,
            listOf(
                transaction("1", "8400.00", "Company"),
                transaction("2", "-8400.00", "Landlord"),
                transaction("3", "-8400.00", "Company")
            ),
            context(
                movements = listOf(rent, salary),
                memories = memories(
                    memory("Company", ImportAction.LINK, recurringId = 8),
                    memory("Landlord", ImportAction.LINK, recurringId = 9)
                )
            )
        )

        assertThat(lines[0].link).isSameAs(salary)
        assertThat(lines[1].link).isSameAs(rent)
        assertThat(lines[2].action).isEqualTo(ImportAction.CREATE)
    }

    @Test
    fun `should link an outgoing registered transfer and ignore an incoming one, both marked as registered`() {

        val outgoing = transfer(60, "200.00", from = 1, to = 2, date = LocalDate.of(2026, 11, 20))
        val incoming = transfer(61, "300.00", from = 2, to = 1, date = LocalDate.of(2026, 11, 19))
        val farAway = transfer(62, "75.00", from = 1, to = 2, date = LocalDate.of(2026, 10, 1))
        val otherWalletTransfer = transfer(63, "10.00", from = 2, to = 3, date = LocalDate.of(2026, 11, 20))

        val lines = suggester.suggest(
            walletImport,
            listOf(
                transaction("1", "-200.00", "Maria", date = LocalDate.of(2026, 11, 22)),
                transaction("2", "300.00", "Maria", date = LocalDate.of(2026, 11, 19)),
                transaction("3", "-75.00", "Maria", date = LocalDate.of(2026, 11, 20)),
                transaction("4", "-200.00", "Maria", date = LocalDate.of(2026, 11, 20)),
                transaction("5", "-10.00", "Maria", date = LocalDate.of(2026, 11, 20))
            ),
            context(transfers = listOf(outgoing, incoming, farAway, otherWalletTransfer))
        )

        assertThat(lines[0].action).isEqualTo(ImportAction.LINK)
        assertThat(lines[0].link).isSameAs(outgoing)
        assertThat(lines[0].alreadyRegistered).isTrue()
        assertThat(lines[1].action).isEqualTo(ImportAction.IGNORE)
        assertThat(lines[1].alreadyRegistered).isTrue()
        assertThat(lines[2].action).isEqualTo(ImportAction.CREATE)
        assertThat(lines[3].action).isEqualTo(ImportAction.CREATE)
        assertThat(lines[3].alreadyRegistered).isFalse()
        assertThat(lines[4].action).isEqualTo(ImportAction.CREATE)
    }

    @Test
    fun `should suggest a transfer or ignore from the memory only when it fits the line`() {

        val lines = suggester.suggest(
            walletImport,
            listOf(
                transaction("1", "-1000.00", "Fund"),
                transaction("2", "1000.00", "Fund"),
                transaction("3", "-1.00", "Closed fund"),
                transaction("4", "-1.00", "Same wallet fund"),
                transaction("5", "-1.00", "No wallet fund"),
                transaction("6", "-5.00", "Noise"),
                transaction("7", "-5.00", "Market")
            ),
            context(
                memories = memories(
                    memory("Fund", ImportAction.TRANSFER, wallet = otherWallet),
                    memory("Closed fund", ImportAction.TRANSFER, wallet = inactiveWallet),
                    memory("Same wallet fund", ImportAction.TRANSFER, wallet = wallet),
                    memory("No wallet fund", ImportAction.TRANSFER),
                    memory("Noise", ImportAction.IGNORE),
                    memory("Market", ImportAction.CREATE, recurringId = null)
                )
            )
        )

        assertThat(lines[0].action).isEqualTo(ImportAction.TRANSFER)
        assertThat(lines[0].targetWallet).isSameAs(otherWallet)
        assertThat(lines[0].fromMemory).isTrue()
        assertThat(lines[1].action).isEqualTo(ImportAction.CREATE)
        assertThat(lines[2].action).isEqualTo(ImportAction.CREATE)
        assertThat(lines[3].action).isEqualTo(ImportAction.CREATE)
        assertThat(lines[4].action).isEqualTo(ImportAction.CREATE)
        assertThat(lines[5].action).isEqualTo(ImportAction.IGNORE)
        assertThat(lines[5].fromMemory).isTrue()
        assertThat(lines[6].classification).isSameAs(expenseClassification)
    }

    @Test
    fun `should not link a candidate with another value`() {

        val movement = movement(10, "Phone 3/12", "250.00", recurringId = 5, recurringCardId = 1, installment = 3, installments = 12)

        val lines = suggester.suggest(
            walletImport,
            listOf(transaction("1", "-249.90", "Phone")),
            context(
                movements = listOf(movement),
                memories = memories(memory("Phone", ImportAction.LINK, recurringId = 5))
            )
        )

        assertThat(lines[0].action).isEqualTo(ImportAction.CREATE)
        assertThat(lines[0].differentValue).isFalse()

        val cardLines = suggester.suggest(
            cardImport,
            listOf(transaction("1", "-250.00", "Phone", installment = 3, installments = 12)),
            context(movements = listOf(movement))
        )

        assertThat(cardLines[0].differentValue).isFalse()

        val purchase = candidate(ImportCandidateKind.PURCHASE, 20, "Restaurant", "200.00")

        val differing = suggester.suggest(
            cardImport,
            listOf(transaction("1", "-214.60", "Restaurant")),
            context(
                purchases = listOf(purchase),
                memories = memories(memory("Restaurant", ImportAction.LINK, recurringId = null))
            )
        )

        assertThat(differing[0].action).isEqualTo(ImportAction.CREATE)
    }

    @Test
    fun `should report the pending reasons of every action`() {

        val line = suggester.suggest(cardImport, listOf(transaction("1", "-10.00", "Shop")), context())[0]

        assertThat(line.pendingReasons()).containsExactly(ImportLine.COST_CENTER, ImportLine.CLASSIFICATION)

        line.action = ImportAction.CREATE_RECURRING

        assertThat(line.pendingReasons()).containsExactly(
            ImportLine.COST_CENTER,
            ImportLine.CLASSIFICATION,
            ImportLine.INSTALLMENTS
        )

        line.action = ImportAction.LAUNCH_RECURRING

        assertThat(line.pendingReasons()).containsExactly(ImportLine.LINK)

        line.action = ImportAction.TRANSFER

        assertThat(line.pendingReasons()).containsExactly(ImportLine.WALLET)

        line.action = ImportAction.IGNORE

        assertThat(line.pendingReasons()).isEmpty()

        line.link = candidate(ImportCandidateKind.MOVEMENT, 1, "Linked", "20.00")
        line.action = ImportAction.LINK
        line.refreshDifferentValue()

        assertThat(line.differentValue).isTrue()

        line.clearAction()

        assertThat(line.link).isNull()
        assertThat(line.differentValue).isFalse()
    }

    @Test
    fun `should normalize the names of the memory`() {

        assertThat(ImportNameMemory.normalize("  São João & Café - LTDA ")).isEqualTo("sao joao cafe ltda")
        assertThat(ImportNameMemory.normalize("A".repeat(200))).hasSize(150)
    }

    private fun context(
        importedBefore: List<ImportedLine> = emptyList(),
        memories: Map<String, ImportNameMemory> = emptyMap(),
        movements: List<ImportCandidate> = emptyList(),
        purchases: List<ImportCandidate> = emptyList(),
        invoicePayments: List<ImportCandidate> = emptyList(),
        transfers: List<ImportCandidate> = emptyList(),
        recurringMovements: List<ImportCandidate> = emptyList()
    ) = ImportSuggestionContext(importedBefore, memories, movements, purchases, invoicePayments, transfers, recurringMovements)

    private fun memories(vararg memories: ImportNameMemory): Map<String, ImportNameMemory> =
        memories.associateBy { it.normalizedName }

    private fun memory(
        name: String,
        action: ImportAction,
        recurringId: Long? = null,
        wallet: WalletReference? = null
    ) = ImportNameMemory(
        target = Import.Target.CARD,
        normalizedName = ImportNameMemory.normalize(name),
        action = action,
        costCenter = costCenter,
        classification = expenseClassification,
        wallet = wallet,
        recurringId = recurringId
    )

    private fun transaction(
        fitId: String,
        amount: String,
        memo: String,
        installment: Int? = null,
        installments: Int? = null,
        kind: OfxTransactionKind = OfxTransactionKind.REGULAR,
        date: LocalDate = LocalDate.of(2026, 11, 1)
    ) = OfxTransaction(
        type = null,
        postedOn = date,
        amount = BigDecimal(amount),
        fitId = fitId,
        memo = memo,
        name = memo,
        installment = installment,
        installments = installments,
        kind = kind
    )

    private fun candidate(
        kind: ImportCandidateKind,
        id: Long,
        name: String,
        value: String,
        installment: Int? = null,
        installments: Int? = null,
        invoicePayment: Boolean = false
    ) = ImportCandidate(
        kind = kind,
        id = id,
        externalId = UUID.randomUUID(),
        name = name,
        value = BigDecimal(value),
        installment = installment,
        installments = installments,
        invoicePayment = invoicePayment
    )

    private fun movement(
        id: Long,
        name: String,
        value: String,
        recurringId: Long?,
        recurringCardId: Long? = null,
        installment: Int? = null,
        installments: Int? = null,
        type: Movement.Type = Movement.Type.EXPENSE
    ) = ImportCandidate(
        kind = ImportCandidateKind.MOVEMENT,
        id = id,
        externalId = UUID.randomUUID(),
        name = name,
        value = BigDecimal(value),
        movementType = type,
        recurringId = recurringId,
        recurringCardId = recurringCardId,
        installment = installment,
        installments = installments
    )

    private fun transfer(id: Long, value: String, from: Long, to: Long, date: LocalDate) = ImportCandidate(
        kind = ImportCandidateKind.TRANSFER,
        id = id,
        externalId = UUID.randomUUID(),
        name = "Transfer",
        value = BigDecimal(value),
        date = date,
        fromWalletId = from,
        toWalletId = to
    )
}
