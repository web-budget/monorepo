package br.com.webbudget.server.infrastructure.config.security

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties("web-budget.security")
data class SecurityProperties(
    val adminDefaultPassword: String = "",
    val login: LockoutProperties = LockoutProperties(maxAttempts = 5, baseDuration = Duration.ofSeconds(60)),
    val ipLockout: LockoutProperties = LockoutProperties(
        maxAttempts = 20,
        baseDuration = Duration.ofSeconds(60),
        failureWindow = Duration.ofMinutes(15)
    ),
    val registrationLimit: LockoutProperties = LockoutProperties(
        maxAttempts = 10,
        baseDuration = Duration.ofMinutes(15),
        failureWindow = Duration.ofHours(1)
    ),
    val clientIp: ClientIpProperties = ClientIpProperties()
) {

    data class LockoutProperties(
        val maxAttempts: Int,
        val baseDuration: Duration,
        val failureWindow: Duration? = null
    )

    data class ClientIpProperties(
        val trustedProxyCount: Int = 0
    )
}
