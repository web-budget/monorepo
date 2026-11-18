package br.com.webbudget.server.infrastructure.config.security

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("web-budget.google-auth")
data class GoogleAuthProperties(
    val enabled: Boolean = false,
    val clientId: String = "",
    val clientSecret: String = "",
    val clientBaseUrl: String = "http://localhost:8086"
)
