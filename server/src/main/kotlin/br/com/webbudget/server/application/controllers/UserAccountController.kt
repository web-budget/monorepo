package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.application.payloads.ActivateAccountForm
import br.com.webbudget.server.application.payloads.ForgotPasswordForm
import br.com.webbudget.server.application.payloads.RecoverPasswordForm
import br.com.webbudget.server.domain.services.administration.AccountActivationService
import br.com.webbudget.server.domain.services.administration.RecoverPasswordService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/accounts")
class UserAccountController(
    private val recoverPasswordService: RecoverPasswordService,
    private val accountActivationService: AccountActivationService
) {

    @PatchMapping("/activate")
    fun activateAccount(@RequestBody @Valid form: ActivateAccountForm): ResponseEntity<Void> {

        accountActivationService.activate(requireNotNull(form.token), requireNotNull(form.email))

        return ResponseEntity.ok().build()
    }

    @PatchMapping("/forgot-password")
    fun forgotPassword(@RequestBody @Valid form: ForgotPasswordForm): ResponseEntity<Void> {

        recoverPasswordService.registerRecoveryAttempt(requireNotNull(form.email))

        return ResponseEntity.accepted().build()
    }

    @PatchMapping("/recover-password")
    fun recoverPassword(@RequestBody @Valid form: RecoverPasswordForm): ResponseEntity<Void> {

        recoverPasswordService.recover(
            requireNotNull(form.password),
            requireNotNull(form.token),
            requireNotNull(form.email)
        )

        return ResponseEntity.ok().build()
    }
}
