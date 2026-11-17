package br.com.webbudget.server.application.controllers

import br.com.webbudget.server.BaseIntegrationTest
import br.com.webbudget.server.domain.entities.administration.Role
import br.com.webbudget.server.infrastructure.config.security.RequiresRole
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.annotation.AnnotatedElementUtils
import org.springframework.http.ResponseEntity
import org.springframework.util.AntPathMatcher
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.method.HandlerMethod
import org.springframework.web.servlet.mvc.method.RequestMappingInfo
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping

class RequiresRoleCoverageTest : BaseIntegrationTest() {

    @Autowired
    private lateinit var requestMappingHandlerMapping: RequestMappingHandlerMapping

    @Test
    fun `should require a role on every business route`() {

        val routes = requestMappingHandlerMapping.handlerMethods.keys.flatMap { it.patternValues }
        assertThat(routes).contains("/private/{version}/administration/users", "/private/{version}/auth/login")

        val unprotected = findUnprotectedRoutes(requestMappingHandlerMapping.handlerMethods)

        assertThat(unprotected)
            .describedAs("routes without @RequiresRole, which only have the path rule cached at login")
            .isEmpty()
    }

    @Test
    fun `should find a route whose controller has no required role`() {

        val handlerMethods = mapOf(
            routeOf("/private/{version}/unprotected", UnprotectedController::class.java),
            routeOf("/private/{version}/class-protected", ClassProtectedController::class.java),
            routeOf("/private/{version}/method-protected", MethodProtectedController::class.java),
            routeOf("/private/{version}/auth/session", UnprotectedController::class.java)
        )

        assertThat(findUnprotectedRoutes(handlerMethods)).containsExactly("/private/{version}/unprotected")
    }

    private fun findUnprotectedRoutes(handlerMethods: Map<RequestMappingInfo, HandlerMethod>): List<String> =
        handlerMethods
            .filterValues { handler -> AnnotatedElementUtils.hasAnnotation(handler.beanType, RestController::class.java) }
            .flatMap { (info, handler) -> info.patternValues.map { path -> path to handler } }
            .filter { (path, _) -> path.startsWith(BUSINESS_PREFIX) && PUBLIC_PATTERNS.none { matcher.match(it, path) } }
            .filterNot { (_, handler) -> hasRequiredRole(handler) }
            .map { (path, _) -> path }
            .sorted()

    private fun hasRequiredRole(handler: HandlerMethod): Boolean =
        AnnotatedElementUtils.hasAnnotation(handler.method, RequiresRole::class.java) ||
            AnnotatedElementUtils.hasAnnotation(handler.beanType, RequiresRole::class.java)

    private fun routeOf(path: String, controller: Class<*>): Pair<RequestMappingInfo, HandlerMethod> {
        val method = controller.getMethod("handle")
        return RequestMappingInfo.paths(path).build() to HandlerMethod(controller.getDeclaredConstructor().newInstance(), method)
    }

    @RestController
    class UnprotectedController {

        @GetMapping
        fun handle(): ResponseEntity<Void> = ResponseEntity.ok().build()
    }

    @RestController
    @RequiresRole(Role.FINANCIAL)
    class ClassProtectedController {

        @GetMapping
        fun handle(): ResponseEntity<Void> = ResponseEntity.ok().build()
    }

    @RestController
    @RequestMapping
    class MethodProtectedController {

        @GetMapping
        @RequiresRole(Role.FINANCIAL)
        fun handle(): ResponseEntity<Void> = ResponseEntity.ok().build()
    }

    companion object {
        private const val BUSINESS_PREFIX = "/private/{version}/"

        private val PUBLIC_PATTERNS = listOf("/private/{version}/auth/**", "/private/{version}/accounts/**", "/private/{version}/error-probe/**")

        private val matcher = AntPathMatcher()
    }
}
