package br.com.webbudget.server

import org.springframework.boot.resttestclient.autoconfigure.RestTestClientBuilderCustomizer
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpRequest
import org.springframework.http.client.ClientHttpRequestExecution
import org.springframework.http.client.ClientHttpRequestInterceptor
import org.springframework.http.client.ClientHttpResponse

class TestSessionCookies {

    @Volatile
    var header: String? = null
}

@TestConfiguration(proxyBeanMethods = false)
class RestClientTestConfiguration {

    @Bean
    fun testSessionCookies(): TestSessionCookies = TestSessionCookies()

    @Bean
    fun sessionCookieRestTestClientBuilderCustomizer(sessionCookies: TestSessionCookies): RestTestClientBuilderCustomizer =
        RestTestClientBuilderCustomizer { builder ->
            builder.requestInterceptor(SessionCookieInterceptor(sessionCookies))
        }

    private class SessionCookieInterceptor(
        private val sessionCookies: TestSessionCookies
    ) : ClientHttpRequestInterceptor {

        override fun intercept(
            request: HttpRequest,
            body: ByteArray,
            execution: ClientHttpRequestExecution
        ): ClientHttpResponse {

            val skipCsrfToken = request.headers.remove(SKIP_CSRF_TOKEN_HEADER) != null

            val cookieHeader = request.headers.getFirst(HttpHeaders.COOKIE) ?: sessionCookies.header

            if (cookieHeader != null) {
                request.headers.set(HttpHeaders.COOKIE, cookieHeader)

                val needsCsrfToken = request.method !in SAFE_METHODS && !request.headers.containsHeader(CSRF_HEADER)

                if (needsCsrfToken && !skipCsrfToken) {
                    cookieValue(cookieHeader, CSRF_COOKIE)?.let { token -> request.headers.set(CSRF_HEADER, token) }
                }
            }

            return execution.execute(request, body)
        }

        private fun cookieValue(cookieHeader: String, name: String): String? = cookieHeader.split(";")
            .map { it.trim() }
            .firstOrNull { it.startsWith("$name=") }
            ?.substringAfter("=")
    }

    companion object {
        const val SKIP_CSRF_TOKEN_HEADER = "X-Test-Skip-Csrf-Token"
        const val CSRF_HEADER = "X-XSRF-TOKEN"
        const val CSRF_COOKIE = "XSRF-TOKEN"
        const val SESSION_COOKIE = "JSESSIONID"

        private val SAFE_METHODS = setOf(HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS, HttpMethod.TRACE)
    }
}
