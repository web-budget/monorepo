package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.ImportMapper
import br.com.webbudget.server.application.payloads.financial.ImportCandidateView
import br.com.webbudget.server.application.payloads.financial.ImportCountsView
import br.com.webbudget.server.application.payloads.financial.ImportCreatedView
import br.com.webbudget.server.application.payloads.financial.ImportFilter
import br.com.webbudget.server.application.payloads.financial.ImportLineFilter
import br.com.webbudget.server.application.payloads.financial.ImportLineUpdateForm
import br.com.webbudget.server.application.payloads.financial.ImportLineView
import br.com.webbudget.server.application.payloads.financial.ImportLinesBatchForm
import br.com.webbudget.server.application.payloads.financial.ImportListView
import br.com.webbudget.server.application.payloads.financial.ImportView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.entities.financial.Import
import br.com.webbudget.server.domain.entities.financial.ImportLine
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.services.financial.ImportService
import br.com.webbudget.server.domain.services.financial.ImportSummaryService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.ImportCriteria
import br.com.webbudget.server.infrastructure.repository.financial.ImportLineCriteria
import br.com.webbudget.server.infrastructure.repository.financial.ImportLineRepository
import br.com.webbudget.server.infrastructure.repository.financial.ImportRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementReferenceRepository
import br.com.webbudget.server.infrastructure.repository.map
import jakarta.validation.Valid
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.servlet.support.ServletUriComponentsBuilder
import java.util.UUID

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/imports")
class ImportController(
    private val importMapper: ImportMapper,
    private val importService: ImportService,
    private val importSummaryService: ImportSummaryService,
    private val importRepository: ImportRepository,
    private val importLineRepository: ImportLineRepository,
    private val movementReferenceRepository: MovementReferenceRepository
) {

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun create(
        @RequestParam financialPeriod: UUID,
        @RequestParam(required = false) card: UUID?,
        @RequestParam(required = false) wallet: UUID?,
        @RequestPart file: MultipartFile
    ): ResponseEntity<ImportCreatedView> {

        val import = Import(
            financialPeriod = movementReferenceRepository.findFinancialPeriod(financialPeriod)
                ?: throw ResourceNotFoundException(),
            card = card?.let { movementReferenceRepository.findCard(it) ?: throw ResourceNotFoundException() },
            wallet = wallet?.let { movementReferenceRepository.findWallet(it) ?: throw ResourceNotFoundException() },
            fileName = file.originalFilename.orEmpty().take(FILE_NAME_MAX_LENGTH)
        )

        val created = importService.create(import, file.bytes)

        val location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created)
            .toUri()

        return ResponseEntity.accepted().location(location).body(ImportCreatedView(created))
    }

    @GetMapping
    fun get(filter: ImportFilter, pageable: Pageable): ResponseEntity<PagedModel<ImportListView>> {

        val page = importRepository.findAll(filter.toCriteria(), pageable)

        val lines = importRepository.countLines(page.content.map { it.id!! })

        return ResponseEntity.ok(page.map { importMapper.mapToListView(it, lines[it.id] ?: 0) })
    }

    @GetMapping("/counts")
    fun getCounts(filter: ImportFilter): ResponseEntity<ImportCountsView> {

        val counts = importRepository.countByStatus(filter.toCriteria())

        return ResponseEntity.ok(
            ImportCountsView(
                processing = counts[Import.Status.PROCESSING] ?: 0,
                ready = counts[Import.Status.READY] ?: 0,
                failed = counts[Import.Status.FAILED] ?: 0,
                saved = counts[Import.Status.SAVED] ?: 0,
                undone = counts[Import.Status.UNDONE] ?: 0,
                total = counts.values.sum()
            )
        )
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<ImportView> {

        val import = findImport(id)

        return ResponseEntity.ok(importMapper.mapToView(import, importSummaryService.summarize(import)))
    }

    @DeleteMapping("/{id}")
    fun discard(@PathVariable id: UUID): ResponseEntity<Void> {

        importService.discard(findImport(id))

        return ResponseEntity.ok().build()
    }

    @GetMapping("/{id}/lines")
    fun getLines(
        @PathVariable id: UUID,
        filter: ImportLineFilter,
        pageable: Pageable
    ): ResponseEntity<PagedModel<ImportLineView>> {

        val criteria = ImportLineCriteria(filter.filter, filter.pending, filter.actions)

        return importLineRepository.findAll(findImport(id), criteria, pageable)
            .map { importMapper.mapToLineView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @PatchMapping("/{id}/lines/{lineId}")
    fun updateLine(
        @PathVariable id: UUID,
        @PathVariable lineId: UUID,
        @RequestBody @Valid form: ImportLineUpdateForm
    ): ResponseEntity<ImportLineView> {

        val import = findImport(id)

        val line = importService.updateLine(import, findLine(import, lineId), importMapper.mapToChange(form))

        return ResponseEntity.ok(importMapper.mapToLineView(line))
    }

    @PatchMapping("/{id}/lines")
    fun updateLines(@PathVariable id: UUID, @RequestBody @Valid form: ImportLinesBatchForm): ResponseEntity<Void> {

        val import = findImport(id)

        importService.updateLines(import, form.lines!!.map { findLine(import, it) }, importMapper.mapToChange(form))

        return ResponseEntity.ok().build()
    }

    @GetMapping("/{id}/lines/{lineId}/candidates")
    fun getCandidates(@PathVariable id: UUID, @PathVariable lineId: UUID): ResponseEntity<List<ImportCandidateView>> {

        val import = findImport(id)

        return ResponseEntity.ok(importService.candidates(import, findLine(import, lineId)).map { importMapper.mapToCandidateView(it) })
    }

    private fun ImportFilter.toCriteria() = ImportCriteria(
        text = filter,
        statuses = statuses,
        target = target,
        card = card,
        wallet = wallet,
        financialPeriod = financialPeriod
    )

    private fun findImport(id: UUID): Import = importRepository.findByExternalId(id) ?: throw ResourceNotFoundException()

    private fun findLine(import: Import, id: UUID): ImportLine =
        importLineRepository.findByExternalId(import, id) ?: throw ResourceNotFoundException()

    companion object {
        private const val FILE_NAME_MAX_LENGTH = 255
    }
}
