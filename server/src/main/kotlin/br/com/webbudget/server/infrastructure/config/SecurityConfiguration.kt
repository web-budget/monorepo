package br.com.webbudget.server.infrastructure.config

import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.infrastructure.config.security.ProblemDetailAccessDeniedHandler
import br.com.webbudget.server.infrastructure.config.security.ProblemDetailAuthenticationEntryPoint
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.core.annotation.AnnotationTemplateExpressionDefaults
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.savedrequest.NullRequestCache

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfiguration {

    @Bean
    fun configureSecurity(
        http: HttpSecurity,
        securityContextRepository: SecurityContextRepository,
        authenticationEntryPoint: ProblemDetailAuthenticationEntryPoint,
        accessDeniedHandler: ProblemDetailAccessDeniedHandler
    ): SecurityFilterChain {

        val csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse()
        csrfTokenRepository.setCookieCustomizer { cookie -> cookie.sameSite(SAME_SITE_LAX) }

        http.csrf { csrf -> csrf.spa().csrfTokenRepository(csrfTokenRepository) }

        http {
            logout { disable() }
            requestCache { requestCache = NullRequestCache() }
            securityContext { this.securityContextRepository = securityContextRepository }
            authorizeHttpRequests {
                authorize("/actuator/health/**", permitAll)
                authorize("/actuator/info/**", permitAll)
                authorize("/private/v1/accounts/**", permitAll)
                authorize("/private/v1/auth/login", permitAll)
                authorize("/private/v1/auth/register", permitAll)
                authorize("/private/v1/administration/**", hasRole(Role.ADMINISTRATION))
                authorize("/private/v1/registration/**", hasRole(Role.REGISTRATION))
                authorize("/private/v1/financial/**", hasRole(Role.FINANCIAL))
                authorize("/private/v1/dashboards/**", hasRole(Role.DASHBOARDS))
                authorize(anyRequest, authenticated)
            }
            exceptionHandling {
                this.authenticationEntryPoint = authenticationEntryPoint
                this.accessDeniedHandler = accessDeniedHandler
            }
        }
        return http.build()
    }

    @Bean
    fun configureSecurityContextRepository(): SecurityContextRepository = HttpSessionSecurityContextRepository()

    @Bean
    fun configurePasswordEncoder(): PasswordEncoder = BCryptPasswordEncoder(BCRYPT_STRENGTH)

    @Bean
    fun configureUserDetailsService(): UserDetailsService = InMemoryUserDetailsManager()

    companion object {

        private const val BCRYPT_STRENGTH = 11
        private const val SAME_SITE_LAX = "Lax"

        @Bean
        @JvmStatic
        fun configureAnnotationTemplateExpressionDefaults(): AnnotationTemplateExpressionDefaults =
            AnnotationTemplateExpressionDefaults()
    }
}
