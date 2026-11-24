package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.AuthProvider
import br.com.webbudget.server.domain.entities.administration.Language
import br.com.webbudget.server.domain.entities.administration.User
import br.com.webbudget.server.domain.entities.administration.UserStatus
import br.com.webbudget.server.domain.exceptions.AccountDisabledException
import br.com.webbudget.server.domain.exceptions.AuthenticationFailedException
import br.com.webbudget.server.domain.exceptions.GoogleLoginRejectedException
import br.com.webbudget.server.domain.exceptions.InvalidCredentialsException
import br.com.webbudget.server.domain.exceptions.InvalidGoogleLinkTokenException
import br.com.webbudget.server.domain.exceptions.InvalidTotpCodeException
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.exceptions.TotpAlreadyEnabledException
import br.com.webbudget.server.domain.security.CurrentUser
import br.com.webbudget.server.domain.security.CurrentUserProvider
import br.com.webbudget.server.infrastructure.config.security.AttemptKeys
import br.com.webbudget.server.infrastructure.config.security.GoogleAuthProperties
import br.com.webbudget.server.infrastructure.config.security.GoogleLinkTokenStore
import br.com.webbudget.server.infrastructure.config.security.IpAttemptLimiter
import br.com.webbudget.server.infrastructure.config.security.LoginAttemptLimiter
import br.com.webbudget.server.infrastructure.config.security.SecurityProperties
import br.com.webbudget.server.infrastructure.config.security.TotpAttemptLimiter
import br.com.webbudget.server.infrastructure.config.security.toAuthorities
import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val ipAttemptLimiter: IpAttemptLimiter,
    private val loginAttemptLimiter: LoginAttemptLimiter,
    private val totpAttemptLimiter: TotpAttemptLimiter,
    private val totpService: TotpService,
    private val trustedDeviceService: TrustedDeviceService,
    private val securityProperties: SecurityProperties,
    private val currentUserProvider: CurrentUserProvider,
    private val securityContextRepository: SecurityContextRepository,
    private val userService: UserService,
    private val securityNoticeNotifier: SecurityNoticeNotifier,
    private val googleLinkTokenStore: GoogleLinkTokenStore,
    private val googleAuthProperties: GoogleAuthProperties
) {

    private val unknownUserPasswordHash: String by lazy { passwordEncoder.encode(UNKNOWN_USER_PASSWORD)!! }

    @Transactional
    fun login(
        email: String,
        password: String,
        totpCode: String?,
        trustDevice: Boolean,
        clientIp: String,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): LoginResult {

        val user = verifyCredentials(email, password, clientIp)

        if (!securityProperties.totp.required) {
            return authenticated(user, request, response)
        }

        if (!user.totpEnabled) {
            return LoginResult.EnrollmentRequired
        }

        if (trustedDeviceService.isTrusted(user.id!!, request)) {
            return authenticated(user, request, response)
        }

        if (totpCode == null) {
            return LoginResult.TotpRequired
        }

        verifyTotpCode(user, totpCode, clientIp)

        if (trustDevice) {
            trustedDeviceService.trust(user.id!!, request, response)
        }

        return authenticated(user, request, response)
    }

    @Transactional
    fun enrollTotp(email: String, password: String, clientIp: String): TotpEnrollment {

        val user = verifyCredentials(email, password, clientIp)

        if (user.totpEnabled) {
            throw TotpAlreadyEnabledException()
        }

        val secret = totpService.generateSecret()

        userRepository.updateTotpSecret(user.id!!, secret)

        return TotpEnrollment(secret, totpService.qrCodeDataUri(user.email, secret))
    }

    @Transactional
    fun confirmTotpEnrollment(
        email: String,
        password: String,
        code: String,
        clientIp: String,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): CurrentUser {

        val user = verifyCredentials(email, password, clientIp)

        if (user.totpEnabled) {
            throw TotpAlreadyEnabledException()
        }

        val secret = verifyTotpCode(user, code, clientIp)

        if (!userRepository.enableTotp(user.id!!, secret)) {
            throw TotpAlreadyEnabledException()
        }

        return establishSession(CurrentUser.from(user), request, response)
    }

    @Transactional
    fun handleGoogleLogin(
        identity: GoogleIdentity,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): GoogleLoginResult {

        val linked = userRepository.findByGoogleSub(identity.subject)

        if (linked != null) {
            return googleAuthenticated(linked, request, response)
        }

        val sameEmail = userRepository.findByEmailIgnoreCase(identity.email)

        if (sameEmail == null) {
            return googleAuthenticated(userService.createGoogleAccount(newGoogleUser(identity)), request, response)
        }

        if (sameEmail.authProvider != AuthProvider.LOCAL) {
            throw GoogleLoginRejectedException("The e-mail belongs to an account linked to another Google identity")
        }

        return GoogleLoginResult.LinkRequired(googleLinkTokenStore.issue(sameEmail.externalId!!, identity.subject))
    }

    @Transactional
    fun linkGoogleAccount(
        linkToken: String,
        password: String,
        totpCode: String?,
        clientIp: String,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): GoogleLinkResult {

        if (!googleAuthProperties.enabled) {
            throw ResourceNotFoundException()
        }

        val pending = googleLinkTokenStore.peek(linkToken) ?: throw InvalidGoogleLinkTokenException()

        val user = userRepository.findByExternalId(pending.userExternalId) ?: run {
            googleLinkTokenStore.burn(linkToken)
            throw InvalidGoogleLinkTokenException()
        }

        try {
            verifyCredentials(user.email, password, clientIp) { user }
        } catch (exception: AuthenticationFailedException) {
            googleLinkTokenStore.burn(linkToken)
            throw exception
        }

        if (securityProperties.totp.required && user.totpEnabled && !trustedDeviceService.isTrusted(user.id!!, request)) {

            if (totpCode == null) {
                return GoogleLinkResult.TotpRequired
            }

            try {
                verifyTotpCode(user, totpCode, clientIp)
            } catch (exception: InvalidTotpCodeException) {
                googleLinkTokenStore.burn(linkToken)
                throw exception
            }
        }

        val consumed = googleLinkTokenStore.consume(linkToken) ?: throw InvalidGoogleLinkTokenException()

        if (user.authProvider != AuthProvider.LOCAL || userRepository.findByGoogleSub(consumed.googleSub) != null) {
            throw InvalidGoogleLinkTokenException()
        }

        val linked = userRepository.linkGoogleAccount(user, consumed.googleSub)

        securityNoticeNotifier.notifyGoogleAccountLinked(linked)

        return GoogleLinkResult.Linked(establishSession(CurrentUser.from(linked), request, response))
    }

    fun currentSession(): CurrentUser = currentUserProvider.getSessionUser()

    @Transactional
    fun changeDueDateNotices(enabled: Boolean): CurrentUser {

        userRepository.updateDueDateNotices(currentUserProvider.getSessionUser().id, enabled)

        return currentUserProvider.getSessionUser()
    }

    @Transactional
    fun changeName(name: String): CurrentUser {

        userRepository.updateName(currentUserProvider.getSessionUser().id, name.trim())

        return currentUserProvider.getSessionUser()
    }

    @Transactional
    fun changeLanguage(language: Language): CurrentUser {

        userRepository.updateDefaultLanguage(currentUserProvider.getSessionUser().id, language)

        return currentUserProvider.getSessionUser()
    }

    fun logout(request: HttpServletRequest) {
        request.session.invalidate()
        SecurityContextHolder.clearContext()
    }

    private fun verifyCredentials(email: String, password: String, clientIp: String): User =
        verifyCredentials(email, password, clientIp) { userRepository.findByEmail(email) }

    private fun verifyCredentials(email: String, password: String, clientIp: String, loadUser: () -> User?): User {

        val attemptKey = AttemptKeys.of(email, clientIp)

        ipAttemptLimiter.checkNotLocked(clientIp)
        loginAttemptLimiter.checkNotLocked(attemptKey)

        val user = loadUser()
        val storedHash = user?.password

        val passwordMatches = passwordEncoder.matches(password, storedHash ?: unknownUserPasswordHash)

        if (user == null || storedHash == null || !passwordMatches) {
            loginAttemptLimiter.recordFailure(attemptKey)
            ipAttemptLimiter.recordFailure(clientIp)
            throw InvalidCredentialsException()
        }

        loginAttemptLimiter.recordSuccess(attemptKey)

        if (!user.active || user.status == UserStatus.BLOCKED) {
            throw AccountDisabledException()
        }

        return user
    }

    private fun verifyTotpCode(user: User, code: String, clientIp: String): String {

        val attemptKey = AttemptKeys.of(user.email, clientIp)

        totpAttemptLimiter.checkNotLocked(attemptKey)

        val secret = userRepository.findTotpSecret(user.id!!)

        if (secret == null || !totpService.isCodeValid(secret, code)) {
            totpAttemptLimiter.recordFailure(attemptKey)
            ipAttemptLimiter.recordFailure(clientIp)
            throw InvalidTotpCodeException()
        }

        totpAttemptLimiter.recordSuccess(attemptKey)

        return secret
    }

    private fun authenticated(user: User, request: HttpServletRequest, response: HttpServletResponse): LoginResult =
        LoginResult.Authenticated(establishSession(CurrentUser.from(user), request, response))

    private fun googleAuthenticated(
        user: User,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): GoogleLoginResult {

        if (!user.active || user.status == UserStatus.BLOCKED) {
            throw AccountDisabledException()
        }

        return GoogleLoginResult.Authenticated(establishSession(CurrentUser.from(user), request, response))
    }

    private fun newGoogleUser(identity: GoogleIdentity): User = User(
        active = true,
        name = identity.displayName(),
        email = identity.email,
        password = null,
        defaultLanguage = Language.PT_BR,
        status = UserStatus.PENDING,
        authProvider = AuthProvider.GOOGLE,
        googleSub = identity.subject
    )

    private fun establishSession(
        user: CurrentUser,
        request: HttpServletRequest,
        response: HttpServletResponse
    ): CurrentUser {

        request.getSession(true)
        request.changeSessionId()

        val context = SecurityContextHolder.createEmptyContext()
        context.authentication = UsernamePasswordAuthenticationToken(user, null, user.toAuthorities())
        SecurityContextHolder.setContext(context)

        securityContextRepository.saveContext(context, request, response)

        return user
    }

    companion object {
        private const val UNKNOWN_USER_PASSWORD = "unknown-user-password"
    }
}

data class TotpEnrollment(
    val secretKey: String,
    val qrCodeDataUri: String
)

data class GoogleIdentity(
    val subject: String,
    val email: String,
    val name: String?
) {

    fun displayName(): String = name.orEmpty()
        .replace(NAME_FORBIDDEN_CHARACTERS, " ")
        .trim()
        .take(MAX_NAME_LENGTH)
        .ifBlank { email.substringBefore('@').take(MAX_NAME_LENGTH) }

    companion object {
        private const val MAX_NAME_LENGTH = 100
        private val NAME_FORBIDDEN_CHARACTERS = Regex("[\\p{Cc}\\p{Zl}\\p{Zp}]")
    }
}

sealed interface GoogleLoginResult {

    data class Authenticated(val user: CurrentUser) : GoogleLoginResult

    data class LinkRequired(val linkToken: String) : GoogleLoginResult
}

sealed interface GoogleLinkResult {

    data class Linked(val user: CurrentUser) : GoogleLinkResult

    data object TotpRequired : GoogleLinkResult
}

sealed interface LoginResult {

    data class Authenticated(val user: CurrentUser) : LoginResult

    data object EnrollmentRequired : LoginResult

    data object TotpRequired : LoginResult
}
