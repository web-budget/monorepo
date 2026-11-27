package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportCandidate
import br.com.webbudget.server.domain.entities.financial.ImportCandidateKind
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.ImportLineChange
import br.com.webbudget.server.domain.entities.financial.Movement
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.IMPORT_LINK_NOT_AVAILABLE
import br.com.webbudget.server.domain.exceptions.ErrorCodes.IMPORT_NOT_DISCARDABLE
import br.com.webbudget.server.domain.validators.OnCreateValidation
import br.com.webbudget.server.domain.validators.OnUpdateValidation
import br.com.webbudget.server.domain.validators.financial.ImportLineValidator
import br.com.webbudget.server.domain.validators.financial.ImportValidator
import br.com.webbudget.server.infrastructure.repository.financial.ImportCandidateRepository
import br.com.webbudget.server.infrastructure.repository.financial.ImportLineRepository
import br.com.webbudget.server.infrastructure.repository.financial.ImportRepository
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

class ImportRequested(
    val importId: Long,
    val content: ByteArray
)

@Service
@Transactional(readOnly = true)
class ImportService(
    private val importRepository: ImportRepository,
    private val importLineRepository: ImportLineRepository,
    private val importCandidateRepository: ImportCandidateRepository,
    private val eventPublisher: ApplicationEventPublisher,
    @OnCreateValidation
    private val creationValidators: List<ImportValidator>,
    @OnUpdateValidation
    private val lineValidators: List<ImportLineValidator>
) {

    @Transactional
    fun create(import: Import, content: ByteArray): UUID {

        creationValidators.forEach { it.validate(import) }

        val created = importRepository.insert(import)

        eventPublisher.publishEvent(ImportRequested(created.id!!, content))

        return created.externalId!!
    }

    @Transactional
    fun discard(import: Import) {

        if (import.status == Import.Status.SAVED || import.status == Import.Status.UNDONE) {
            throw DomainException.conflict(message = "A saved import cannot be discarded", error = IMPORT_NOT_DISCARDABLE)
        }

        importRepository.delete(import)
    }

    @Transactional
    fun updateLine(import: Import, line: ImportLine, change: ImportLineChange): ImportLine {

        val used = usedTargets(import, line)

        apply(line, change, used)

        return saveLine(import, line)
    }

    @Transactional
    fun updateLines(import: Import, lines: List<ImportLine>, change: ImportLineChange) {

        lines.forEach { line ->
            apply(line, change, usedTargets(import, line))
            saveLine(import, line)
        }
    }

    fun candidates(import: Import, line: ImportLine): List<ImportCandidate> =
        pool(import, line).filter { candidate -> (candidate.kind to candidate.id) !in usedTargets(import, line) }

    private fun saveLine(import: Import, line: ImportLine): ImportLine {

        lineValidators.forEach { it.validate(line) }

        line.fromMemory = false
        line.refreshDifferentValue()

        importLineRepository.update(line)
        importRepository.touch(import.id!!)

        return line
    }

    private fun apply(line: ImportLine, change: ImportLineChange, used: Set<Pair<ImportCandidateKind, Long>>) {

        if (change.action != null && change.action != line.action) {
            line.clearAction()
            line.action = change.action
        }

        change.name?.let { line.name = it }
        change.costCenter?.let { line.costCenter = it }
        change.classification?.let { line.classification = it }
        change.wallet?.let { line.targetWallet = it }
        change.installment?.let { line.installment = it }
        change.installments?.let { line.installments = it }

        change.link?.let { reference ->
            line.link = pool(line.import, line).firstOrNull { candidate ->
                candidate.kind == reference.kind &&
                    candidate.externalId == reference.externalId &&
                    (candidate.kind to candidate.id) !in used
            } ?: throw DomainException("The link target is not available for this line", IMPORT_LINK_NOT_AVAILABLE)
        }
    }

    private fun usedTargets(import: Import, line: ImportLine): Set<Pair<ImportCandidateKind, Long>> = importLineRepository.findAll(import)
        .filter { other -> other.id != line.id }
        .mapNotNull { other -> other.link }
        .map { candidate -> candidate.kind to candidate.id }
        .toSet()

    private fun pool(import: Import, line: ImportLine): List<ImportCandidate> = when (line.action) {
        ImportAction.LINK -> linkPool(import, line)
        ImportAction.INVOICE_PAYMENT -> importCandidateRepository.findOpenInvoicePayments()
        ImportAction.LAUNCH_RECURRING -> importCandidateRepository.findLaunchableRecurringMovements(
            import.card!!.externalId,
            import.financialPeriod.externalId
        )

        else -> emptyList()
    }

    private fun linkPool(import: Import, line: ImportLine): List<ImportCandidate> {

        val card = import.card

        if (card != null) {
            return importCandidateRepository.findOpenMovements(import.financialPeriod.id, Movement.Type.EXPENSE) +
                importCandidateRepository.findLoosePurchases(card.id, import.financialPeriod.id)
        }

        if (line.isCredit) {
            return importCandidateRepository.findOpenMovements(null, Movement.Type.INCOME)
        }

        val walletId = import.wallet!!.id

        return importCandidateRepository.findOpenMovements(null, Movement.Type.EXPENSE) +
            importCandidateRepository.findTransfers(
                walletId,
                line.postedOn.minusDays(LINK_WINDOW_DAYS),
                line.postedOn.plusDays(LINK_WINDOW_DAYS)
            ).filter { transfer -> transfer.fromWalletId == walletId }
    }

    companion object {
        private const val LINK_WINDOW_DAYS = 30L
    }
}
