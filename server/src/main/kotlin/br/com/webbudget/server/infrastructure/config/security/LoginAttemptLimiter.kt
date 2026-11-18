package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.exceptions.TooManyLoginAttemptsException
import org.springframework.stereotype.Component
import java.time.Clock

@Component
class LoginAttemptLimiter(
    securityProperties: SecurityProperties,
    clock: Clock
) {

    private val tracker = AttemptLockoutTracker(
        maxAttempts = securityProperties.login.maxAttempts,
        baseDuration = securityProperties.login.baseDuration,
        clock = clock,
        failureWindow = securityProperties.login.failureWindow
    )

    fun checkNotLocked(attemptKey: String) {
        if (tracker.lockedUntil(attemptKey) != null) {
            throw TooManyLoginAttemptsException()
        }
    }

    fun recordFailure(attemptKey: String) = tracker.recordFailure(attemptKey)

    fun recordSuccess(attemptKey: String) = tracker.recordSuccess(attemptKey)
}
