package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.application.payloads.LoginForm
import br.com.webbudget.server.application.payloads.RegisterForm
import br.com.webbudget.server.application.payloads.SessionView
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.services.administration.AccountRegistrationService
import br.com.webbudget.server.domain.services.administration.AuthService
import br.com.webbudget.server.infrastructure.config.security.ClientIpResolver
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/auth")
class AuthController(
    private val authService: AuthService,
    private val clientIpResolver: ClientIpResolver,
    private val accountRegistrationService: AccountRegistrationService
) {

    @PostMapping("/login")
    fun login(
        @RequestBody @Valid form: LoginForm,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): ResponseEntity<SessionView> {

        val user = authService.login(form.email!!, form.password!!, clientIpResolver.resolve(request), request, response)

        return ResponseEntity.ok(SessionView.from(user))
    }

    @PostMapping("/register")
    fun register(@RequestBody @Valid form: RegisterForm, request: HttpServletRequest): ResponseEntity<Void> {

        accountRegistrationService.register(
            form.name!!,
            form.email!!,
            form.password!!,
            form.defaultLanguage ?: Language.PT_BR,
            clientIpResolver.resolve(request)
        )

        return ResponseEntity.status(HttpStatus.CREATED).build()
    }

    @GetMapping("/session")
    fun session(): ResponseEntity<SessionView> = ResponseEntity.ok(SessionView.from(authService.currentSession()))

    @PostMapping("/logout")
    fun logout(request: HttpServletRequest): ResponseEntity<Void> {

        authService.logout(request)

        return ResponseEntity.ok().build()
    }
}
