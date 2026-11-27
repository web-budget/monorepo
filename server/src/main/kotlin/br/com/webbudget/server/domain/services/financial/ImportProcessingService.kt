package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportNameMemory
import br.com.webbudget.server.domain.entities.financial.ImportSuggestionContext
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.entities.financial.OfxStatement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.ACCOUNT_STATEMENT_ON_CARD
import br.com.webbudget.server.domain.exceptions.ErrorCodes.CARD_STATEMENT_ON_WALLET
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.NO_OPEN_INVOICE
import br.com.webbudget.server.infrastructure.repository.financial.ImportCandidateRepository
import br.com.webbudget.server.infrastructure.repository.financial.ImportLineRepository
import br.com.webbudget.server.infrastructure.repository.financial.ImportNameMemoryRepository
import br.com.webbudget.server.infrastructure.repository.financial.ImportRepository
import br.com.webbudget.server.infrastructure.repository.financial.InvoiceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class ImportProcessingService(
    private val ofxReader: OfxReader,
    private val importSuggester: ImportSuggester,
    private val importRepository: ImportRepository,
    private val importLineRepository: ImportLineRepository,
    private val importCandidateRepository: ImportCandidateRepository,
    private val importNameMemoryRepository: ImportNameMemoryRepository,
    private val invoiceRepository: InvoiceRepository
) {

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun process(importId: Long, content: ByteArray) {

        val import = importRepository.findById(importId)?.takeIf { it.status == Import.Status.PROCESSING } ?: return

        val statement = try {
            ofxReader.read(content)
        } catch (exception: DomainException) {
            return fail(import, exception.error)
        }

        val error = mismatch(import, statement)

        if (error != null) {
            return fail(import, error)
        }

        val lines = importSuggester.suggest(import, statement.transactions, loadContext(import, statement))

        lines.forEach { importLineRepository.insert(it) }

        import.fileType = statement.type
        import.startingOn = statement.startedOn
        import.endingOn = statement.endedOn
        import.ledgerBalance = statement.ledgerBalance?.amount
        import.ledgerBalanceOn = statement.ledgerBalance?.asOf
        import.status = Import.Status.READY

        importRepository.update(import)
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun fail(importId: Long, error: String) {
        importRepository.findById(importId)?.let { fail(it, error) }
    }

    private fun fail(import: Import, error: String) {

        import.status = Import.Status.FAILED
        import.error = error

        importRepository.update(import)
    }

    private fun mismatch(import: Import, statement: OfxStatement): String? = when {
        statement.type != import.expectedFileType ->
            if (import.isCard) ACCOUNT_STATEMENT_ON_CARD else CARD_STATEMENT_ON_WALLET

        !import.financialPeriod.isOpen() -> FINANCIAL_PERIOD_NOT_OPEN

        import.isCard && invoiceRepository.findByCardAndFinancialPeriod(import.card!!.id, import.financialPeriod.id)
            ?.isOpen() != true -> NO_OPEN_INVOICE

        else -> null
    }

    private fun loadContext(import: Import, statement: OfxStatement): ImportSuggestionContext {

        val names = statement.transactions.map { ImportNameMemory.normalize(it.name) }.toSet()
        val memories = importNameMemoryRepository.findByNames(import.target, names)
        val importedBefore = importLineRepository.findImportedBefore(import)

        val card = import.card

        if (card != null) {
            return ImportSuggestionContext(
                importedBefore = importedBefore,
                memories = memories,
                movements = importCandidateRepository.findOpenMovements(import.financialPeriod.id, Movement.Type.EXPENSE),
                purchases = importCandidateRepository.findLoosePurchases(card.id, import.financialPeriod.id),
                invoicePayments = emptyList(),
                transfers = emptyList(),
                recurringMovements = importCandidateRepository.findLaunchableRecurringMovements(
                    card.externalId,
                    import.financialPeriod.externalId
                )
            )
        }

        val dates = statement.transactions.map { it.postedOn }

        return ImportSuggestionContext(
            importedBefore = importedBefore,
            memories = memories,
            movements = importCandidateRepository.findOpenMovements(null, Movement.Type.INCOME) +
                importCandidateRepository.findOpenMovements(null, Movement.Type.EXPENSE),
            purchases = emptyList(),
            invoicePayments = importCandidateRepository.findOpenInvoicePayments(),
            transfers = dates.minOrNull()?.let { first ->
                importCandidateRepository.findTransfers(import.wallet!!.id, first.minusDays(TRANSFER_WINDOW_DAYS), dates.max().plusDays(TRANSFER_WINDOW_DAYS))
            } ?: emptyList(),
            recurringMovements = emptyList()
        )
    }

    companion object {
        private const val TRANSFER_WINDOW_DAYS = 3L
    }
}
