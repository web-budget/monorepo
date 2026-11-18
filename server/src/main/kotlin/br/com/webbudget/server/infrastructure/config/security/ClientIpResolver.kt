package br.com.webbudget.server.infrastructure.config.security

import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Component

@Component
class ClientIpResolver(
    securityProperties: SecurityProperties
) {

    private val trustedProxyCount = securityProperties.clientIp.trustedProxyCount

    fun resolve(request: HttpServletRequest): String {

        val remoteAddress = request.remoteAddr

        if (trustedProxyCount == 0) {
            return remoteAddress
        }

        val forwardedChain = request.getHeaders(FORWARDED_FOR_HEADER).toList()
            .flatMap { headerLine -> headerLine.split(',') }
            .map { it.trim() }
            .filter { it.isNotEmpty() }

        val addressChain = forwardedChain + remoteAddress

        val candidate = addressChain.getOrNull(addressChain.size - 1 - trustedProxyCount)

        return if (candidate != null && looksLikeIpAddress(candidate)) candidate.lowercase() else remoteAddress
    }

    private fun looksLikeIpAddress(candidate: String): Boolean = candidate.length <= MAX_IP_LENGTH &&
            candidate.all { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' || it == '.' || it == ':' }

    companion object {
        private const val FORWARDED_FOR_HEADER = "X-Forwarded-For"
        private const val MAX_IP_LENGTH = 45
    }
}
