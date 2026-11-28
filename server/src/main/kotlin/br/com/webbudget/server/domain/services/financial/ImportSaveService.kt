package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportAction
import br.com.webbudget.server.domain.entities.financial.ImportBlocker
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.entities.financial.ImportNameMemory
import br.com.webbudget.server.domain.entities.financial.ImportSave
import br.com.webbudget.server.domain.exceptions.DomainException
import br.com.webbudget.server.domain.exceptions.ErrorCodes.FINANCIAL_PERIOD_NOT_OPEN
import br.com.webbudget.server.domain.exceptions.ErrorCodes.IMPORT_UNDO_BLOCKED
import br.com.webbudget.server.domain.validators.OnSaveValidation
import br.com.webbudget.server.domain.validators.OnUndoValidation
import br.com.webbudget.server.domain.validators.financial.ImportSaveValidator
import br.com.webbudget.server.domain.validators.financial.ImportUndoValidator
import br.com.webbudget.server.infrastructure.repository.financial.ImportLineRepository
import br.com.webbudget.server.infrastructure.repository.financial.ImportNameMemoryRepository
import br.com.webbudget.server.infrastructure.repository.financial.ImportRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Transactional(readOnly = true)
class ImportSaveService(
    private val ofxReader: OfxReader,
    private val importRepository: ImportRepository,
    private val importLineRepository: ImportLineRepository,
    private val importNameMemoryRepository: ImportNameMemoryRepository,
    private val savers: List<ImportSaver>,
    @OnSaveValidation
    private val saveValidators: List<ImportSaveValidator>,
    @OnUndoValidation
    private val undoValidators: List<ImportUndoValidator>
) {

    @Transactional
    fun save(import: Import): Import {

        val lines = importLineRepository.findAll(import)

        saveValidators.forEach { it.validate(ImportSave(import, lines)) }

        saverOf(import).save(import, lines)

        lines.forEach { importLineRepository.updateResult(it) }
        lines.filter { remembered(it) }.forEach { importNameMemoryRepository.save(toMemory(import, it)) }

        import.status = Import.Status.SAVED
        import.savedOn = LocalDateTime.now()

        return importRepository.update(import)
    }

    @Transactional
    fun undo(import: Import): Import {

        undoValidators.forEach { it.validate(import) }

        val lines = importLineRepository.findAll(import)

        val blockers = blockers(import, lines)

        if (blockers.isNotEmpty()) {
            throw DomainException.conflict(
                parameters = mapOf(
                    "blockers" to blockers.map {
                        mapOf(
                            "reason" to it.reason,
                            "position" to it.position,
                            "name" to it.name,
                            "compartment" to it.compartment,
                            "value" to it.value
                        )
                    }
                ),
                message = "The import cannot be undone",
                error = IMPORT_UNDO_BLOCKED
            )
        }

        saverOf(import).undo(import, lines)

        lines.forEach { importLineRepository.updateResult(it) }

        import.status = Import.Status.UNDONE
        import.undoneOn = LocalDateTime.now()

        return importRepository.update(import)
    }

    fun undoBlockers(import: Import): List<ImportBlocker> =
        if (import.status == Import.Status.SAVED) blockers(import, importLineRepository.findAll(import)) else emptyList()

    private fun blockers(import: Import, lines: List<ImportLine>): List<ImportBlocker> {

        val periodBlockers = if (import.financialPeriod.isOpen()) emptyList() else listOf(ImportBlocker(FINANCIAL_PERIOD_NOT_OPEN))

        return periodBlockers + saverOf(import).blockers(import, lines)
    }

    private fun saverOf(import: Import): ImportSaver = savers.first { it.supports(import) }

    private fun remembered(line: ImportLine): Boolean =
        !line.alreadyImported && !line.alreadyRegistered && !(line.action == ImportAction.IGNORE && line.isCredit)

    private fun toMemory(import: Import, line: ImportLine) = ImportNameMemory(
        target = import.target,
        normalizedName = ImportNameMemory.normalize(ofxReader.deriveName(line.description, import.expectedFileType)),
        action = line.action,
        costCenter = line.costCenter,
        classification = line.classification,
        wallet = line.targetWallet,
        compartment = if (line.action == ImportAction.COMPARTMENT) line.targetCompartment else null,
        recurringId = when (line.action) {
            ImportAction.LINK -> line.link?.recurringId
            ImportAction.LAUNCH_RECURRING -> line.link?.id
            ImportAction.CREATE_RECURRING -> line.createdRecurringId
            else -> null
        }
    )
}
