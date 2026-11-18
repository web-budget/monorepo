package br.com.webbudget.server.infrastructure.config

import br.com.webbudget.server.infrastructure.config.security.GoogleAuthProperties
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository

@Configuration(proxyBeanMethods = false)
class GoogleOAuth2Configuration {

    @Bean
    @ConditionalOnProperty(prefix = "web-budget.google-auth", name = ["enabled"], havingValue = "true")
    fun configureClientRegistrationRepository(properties: GoogleAuthProperties): ClientRegistrationRepository {

        val registration = CommonOAuth2Provider.GOOGLE.getBuilder(REGISTRATION_ID)
            .clientId(properties.clientId)
            .clientSecret(properties.clientSecret)
            .scope("openid", "profile", "email")
            .redirectUri("{baseUrl}/private/login/oauth2/code/{registrationId}")
            .build()

        return InMemoryClientRegistrationRepository(registration)
    }

    companion object {
        const val REGISTRATION_ID = "google"
    }
}
