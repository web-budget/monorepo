package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.exceptions.TooManyRegistrationAttemptsException
import org.springframework.stereotype.Component
import java.time.Clock

@Component
class RegistrationAttemptLimiter(
    securityProperties: SecurityProperties,
    clock: Clock
) {

    private val tracker = AttemptLockoutTracker(
        maxAttempts = securityProperties.registrationLimit.maxAttempts,
        baseDuration = securityProperties.registrationLimit.baseDuration,
        clock = clock,
        failureWindow = securityProperties.registrationLimit.failureWindow
    )

    fun checkAndRecord(clientIp: String) {

        if (tracker.lockedUntil(clientIp) != null) {
            throw TooManyRegistrationAttemptsException()
        }

        tracker.recordFailure(clientIp)
    }
}
