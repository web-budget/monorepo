package br.com.webbudget.server.application.controllers.administration

import br.com.webbudget.server.application.payloads.administration.InitialSetupForm
import br.com.webbudget.server.application.payloads.administration.InitialSetupResultView
import br.com.webbudget.server.application.payloads.administration.InitialSetupStatusView
import br.com.webbudget.server.domain.services.administration.InitialSetupService
import br.com.webbudget.server.infrastructure.config.security.RequiresMainAdmin
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequiresMainAdmin
@RequestMapping("/initial-setup")
class InitialSetupController(
    private val initialSetupService: InitialSetupService
) {

    @GetMapping
    fun get(): ResponseEntity<InitialSetupStatusView> =
        ResponseEntity.ok(InitialSetupStatusView.from(initialSetupService.status()))

    @PostMapping
    fun choose(@RequestBody @Valid form: InitialSetupForm): ResponseEntity<InitialSetupResultView> =
        ResponseEntity.ok(InitialSetupResultView.from(initialSetupService.choose(form.option!!)))
}
