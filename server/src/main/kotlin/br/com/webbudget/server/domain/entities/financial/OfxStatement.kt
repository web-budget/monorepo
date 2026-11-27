package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal
import java.time.LocalDate

enum class OfxStatementType {
    CREDIT_CARD,
    BANK_ACCOUNT
}

enum class OfxTransactionKind {
    REGULAR,
    PAYMENT_RECEIVED,
    INTERNATIONAL_PURCHASE_FEE,
    INTERNATIONAL_PURCHASE_FEE_REFUND,
    INVOICE_PAYMENT
}

data class OfxLedgerBalance(
    val amount: BigDecimal,
    val asOf: LocalDate?
)

data class OfxTransactionIdentity(
    val fitId: String,
    val amount: BigDecimal,
    val description: String
)

data class OfxTransaction(
    val type: String?,
    val postedOn: LocalDate,
    val amount: BigDecimal,
    val fitId: String,
    val memo: String,
    val name: String,
    val installment: Int?,
    val installments: Int?,
    val kind: OfxTransactionKind
) {

    val identity: OfxTransactionIdentity
        get() = OfxTransactionIdentity(fitId, amount.stripTrailingZeros(), memo)

    val isCredit: Boolean
        get() = amount.signum() > 0
}

data class OfxStatement(
    val type: OfxStatementType,
    val startedOn: LocalDate?,
    val endedOn: LocalDate?,
    val ledgerBalance: OfxLedgerBalance?,
    val transactions: List<OfxTransaction>
)
