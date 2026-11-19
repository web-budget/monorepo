package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.exceptions.TooManyLoginAttemptsException
import org.springframework.stereotype.Component
import java.time.Clock

@Component
class IpAttemptLimiter(
    securityProperties: SecurityProperties,
    clock: Clock
) {

    private val tracker = AttemptLockoutTracker(
        maxAttempts = securityProperties.ipLockout.maxAttempts,
        baseDuration = securityProperties.ipLockout.baseDuration,
        clock = clock,
        failureWindow = securityProperties.ipLockout.failureWindow
    )

    fun checkNotLocked(clientIp: String) {
        if (tracker.lockedUntil(clientIp) != null) {
            throw TooManyLoginAttemptsException()
        }
    }

    fun recordFailure(clientIp: String) = tracker.recordFailure(clientIp)
}
