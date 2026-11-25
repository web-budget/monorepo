package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.application.payloads.AuthConfigView
import br.com.webbudget.server.application.payloads.GoogleLinkForm
import br.com.webbudget.server.application.payloads.DueDateNoticesForm
import br.com.webbudget.server.application.payloads.LanguageForm
import br.com.webbudget.server.application.payloads.LoginForm
import br.com.webbudget.server.application.payloads.LoginStepView
import br.com.webbudget.server.application.payloads.PasswordChangeForm
import br.com.webbudget.server.application.payloads.ProfileForm
import br.com.webbudget.server.application.payloads.RegisterForm
import br.com.webbudget.server.application.payloads.SessionView
import br.com.webbudget.server.application.payloads.TotpEnrollForm
import br.com.webbudget.server.application.payloads.TotpEnrollView
import br.com.webbudget.server.application.payloads.TotpVerifyForm
import br.com.webbudget.server.application.payloads.TrustedDeviceView
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.services.administration.AccountRegistrationService
import br.com.webbudget.server.domain.services.administration.AuthService
import br.com.webbudget.server.domain.services.administration.GoogleLinkResult
import br.com.webbudget.server.domain.services.administration.LoginResult
import br.com.webbudget.server.domain.services.administration.TrustedDeviceService
import br.com.webbudget.server.infrastructure.config.security.ClientIpResolver
import br.com.webbudget.server.infrastructure.config.security.GoogleAuthProperties
import br.com.webbudget.server.infrastructure.config.security.SecurityProperties
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/auth")
class AuthController(
    private val authService: AuthService,
    private val clientIpResolver: ClientIpResolver,
    private val accountRegistrationService: AccountRegistrationService,
    private val trustedDeviceService: TrustedDeviceService,
    private val googleAuthProperties: GoogleAuthProperties,
    private val securityProperties: SecurityProperties
) {

    private val totpRequired: Boolean get() = securityProperties.totp.required

    @PostMapping("/login")
    fun login(
        @RequestBody @Valid form: LoginForm,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): ResponseEntity<*> {

        val result = authService.login(
            form.email!!,
            form.password!!,
            form.totpCode,
            form.trustDevice ?: false,
            clientIpResolver.resolve(request),
            request,
            response
        )

        return when (result) {
            is LoginResult.Authenticated -> ResponseEntity.ok(SessionView.from(result.user, totpRequired))
            is LoginResult.EnrollmentRequired -> ResponseEntity.status(HttpStatus.ACCEPTED).body(LoginStepView.NEEDS_ENROLLMENT)
            is LoginResult.TotpRequired -> ResponseEntity.status(HttpStatus.ACCEPTED).body(LoginStepView.NEEDS_TOTP)
        }
    }

    @GetMapping("/config")
    fun config(): ResponseEntity<AuthConfigView> = ResponseEntity.ok(AuthConfigView(googleAuthProperties.enabled))

    @PostMapping("/google/link")
    fun linkGoogleAccount(
        @RequestBody @Valid form: GoogleLinkForm,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): ResponseEntity<*> {

        val result = authService.linkGoogleAccount(
            form.linkToken!!,
            form.password!!,
            form.totpCode,
            clientIpResolver.resolve(request),
            request,
            response
        )

        return when (result) {
            is GoogleLinkResult.Linked -> ResponseEntity.ok(SessionView.from(result.user, totpRequired))
            is GoogleLinkResult.TotpRequired -> ResponseEntity.status(HttpStatus.ACCEPTED).body(LoginStepView.NEEDS_TOTP)
        }
    }

    @PostMapping("/totp/enroll")
    fun enrollTotp(@RequestBody @Valid form: TotpEnrollForm, request: HttpServletRequest): ResponseEntity<TotpEnrollView> {

        val enrollment = authService.enrollTotp(form.email!!, form.password!!, clientIpResolver.resolve(request))

        return ResponseEntity.ok(TotpEnrollView(enrollment.secretKey, enrollment.qrCodeDataUri))
    }

    @PostMapping("/totp/verify")
    fun verifyTotp(
        @RequestBody @Valid form: TotpVerifyForm,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): ResponseEntity<SessionView> {

        val user = authService.confirmTotpEnrollment(
            form.email!!,
            form.password!!,
            form.code!!,
            clientIpResolver.resolve(request),
            request,
            response
        )

        return ResponseEntity.ok(SessionView.from(user, totpRequired))
    }

    @GetMapping("/trusted-devices")
    fun trustedDevices(): ResponseEntity<List<TrustedDeviceView>> =
        ResponseEntity.ok(trustedDeviceService.findAllOfCurrentUser().map { TrustedDeviceView.from(it) })

    @DeleteMapping("/trusted-devices/{id}")
    fun revokeTrustedDevice(@PathVariable id: UUID): ResponseEntity<Void> {

        trustedDeviceService.revoke(id)

        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/trusted-devices")
    fun revokeAllTrustedDevices(): ResponseEntity<Void> {

        trustedDeviceService.revokeAllOfCurrentUser()

        return ResponseEntity.ok().build()
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
    fun session(): ResponseEntity<SessionView> = ResponseEntity.ok(SessionView.from(authService.currentSession(), totpRequired))

    @PatchMapping("/profile")
    fun changeProfile(@RequestBody @Valid form: ProfileForm): ResponseEntity<SessionView> =
        ResponseEntity.ok(SessionView.from(authService.changeName(form.name!!), totpRequired))

    @PatchMapping("/language")
    fun changeLanguage(@RequestBody @Valid form: LanguageForm): ResponseEntity<SessionView> =
        ResponseEntity.ok(SessionView.from(authService.changeLanguage(form.language!!), totpRequired))

    @PatchMapping("/password")
    fun changePassword(
        @RequestBody @Valid form: PasswordChangeForm,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): ResponseEntity<Void> {

        authService.changePassword(form.currentPassword!!, form.newPassword!!, request, response)

        return ResponseEntity.noContent().build()
    }

    @PatchMapping("/due-date-notices")
    fun changeDueDateNotices(@RequestBody @Valid form: DueDateNoticesForm): ResponseEntity<SessionView> =
        ResponseEntity.ok(SessionView.from(authService.changeDueDateNotices(form.enabled!!), totpRequired))

    @PostMapping("/logout")
    fun logout(request: HttpServletRequest): ResponseEntity<Void> {

        authService.logout(request)

        return ResponseEntity.ok().build()
    }
}
