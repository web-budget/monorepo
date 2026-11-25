package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.exceptions.TooManyPasswordChangeAttemptsException
import org.springframework.stereotype.Component
import java.time.Clock

@Component
class PasswordChangeAttemptLimiter(
    securityProperties: SecurityProperties,
    clock: Clock
) {

    private val tracker = AttemptLockoutTracker(
        maxAttempts = securityProperties.passwordChange.maxAttempts,
        baseDuration = securityProperties.passwordChange.baseDuration,
        clock = clock,
        failureWindow = securityProperties.passwordChange.failureWindow
    )

    fun checkNotLocked(attemptKey: String) {
        if (tracker.lockedUntil(attemptKey) != null) {
            throw TooManyPasswordChangeAttemptsException()
        }
    }

    fun recordFailure(attemptKey: String) = tracker.recordFailure(attemptKey)

    fun recordSuccess(attemptKey: String) = tracker.recordSuccess(attemptKey)
}
