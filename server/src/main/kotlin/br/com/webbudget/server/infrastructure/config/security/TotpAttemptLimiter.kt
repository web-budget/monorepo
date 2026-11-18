package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.exceptions.TooManyTotpAttemptsException
import org.springframework.stereotype.Component
import java.time.Clock

@Component
class TotpAttemptLimiter(
    securityProperties: SecurityProperties,
    clock: Clock
) {

    private val tracker = AttemptLockoutTracker(
        maxAttempts = securityProperties.totp.lockout.maxAttempts,
        baseDuration = securityProperties.totp.lockout.baseDuration,
        clock = clock,
        failureWindow = securityProperties.totp.lockout.failureWindow
    )

    fun checkNotLocked(attemptKey: String) {
        if (tracker.lockedUntil(attemptKey) != null) {
            throw TooManyTotpAttemptsException()
        }
    }

    fun recordFailure(attemptKey: String) = tracker.recordFailure(attemptKey)

    fun recordSuccess(attemptKey: String) = tracker.recordSuccess(attemptKey)
}
