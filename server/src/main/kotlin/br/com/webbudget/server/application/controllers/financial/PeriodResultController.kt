package br.com.webbudget.server.application.controllers.financial

import br.com.webbudget.server.application.mappers.financial.PeriodResultMapper
import br.com.webbudget.server.application.payloads.financial.AccumulatedView
import br.com.webbudget.server.application.payloads.financial.PeriodResultFilter
import br.com.webbudget.server.application.payloads.financial.PeriodResultView
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.domain.services.financial.AccumulatedService
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import br.com.webbudget.server.infrastructure.repository.financial.PeriodResultCriteria
import br.com.webbudget.server.infrastructure.repository.financial.PeriodResultRepository
import br.com.webbudget.server.infrastructure.repository.map
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequiresRole(Role.FINANCIAL)
@RequestMapping("/financial/period-results")
class PeriodResultController(
    private val periodResultMapper: PeriodResultMapper,
    private val accumulatedService: AccumulatedService,
    private val periodResultRepository: PeriodResultRepository
) {

    @GetMapping
    fun get(filter: PeriodResultFilter, pageable: Pageable): ResponseEntity<PagedModel<PeriodResultView>> {

        val criteria = PeriodResultCriteria(from = filter.from, to = filter.to, text = filter.filter)

        return periodResultRepository.findAll(criteria, pageable)
            .map { periodResultMapper.mapToView(it) }
            .let { ResponseEntity.ok(it) }
    }

    @GetMapping("/accumulated")
    fun getAccumulated(): ResponseEntity<AccumulatedView> =
        ResponseEntity.ok(periodResultMapper.mapToView(accumulatedService.accumulate()))
}
