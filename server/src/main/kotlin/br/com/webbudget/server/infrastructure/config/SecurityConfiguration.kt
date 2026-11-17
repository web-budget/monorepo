package br.com.webbudget.server.infrastructure.config

import br.com.webbudget.server.domain.entities.administration.Role
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus.UNAUTHORIZED
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint

@Configuration
@EnableWebSecurity
class SecurityConfiguration {

    @Bean
    fun configureSecurity(http: HttpSecurity): SecurityFilterChain {
        http {
            csrf { disable() }
            authorizeHttpRequests {
                authorize("/actuator/health/**", permitAll)
                authorize("/actuator/info/**", permitAll)
                authorize("/private/v1/accounts/**", permitAll)
                authorize("/private/v1/administration/**", hasRole(Role.ADMINISTRATION))
                authorize("/private/v1/registration/**", hasRole(Role.REGISTRATION))
                authorize("/private/v1/financial/**", hasRole(Role.FINANCIAL))
                authorize("/private/v1/dashboards/**", hasRole(Role.DASHBOARDS))
                authorize(anyRequest, authenticated)
            }
            exceptionHandling {
                authenticationEntryPoint = HttpStatusEntryPoint(UNAUTHORIZED)
            }
        }
        return http.build()
    }

    @Bean
    fun configurePasswordEncoder(): PasswordEncoder = BCryptPasswordEncoder(BCRYPT_STRENGTH)

    @Bean
    fun configureUserDetailsService(): UserDetailsService = InMemoryUserDetailsManager()

    companion object {
        private const val BCRYPT_STRENGTH = 11
    }
}
