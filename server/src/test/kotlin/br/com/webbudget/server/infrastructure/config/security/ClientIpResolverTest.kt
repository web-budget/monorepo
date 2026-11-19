package br.com.webbudget.server.infrastructure.config.security

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest

class ClientIpResolverTest {

    @Test
    fun `should ignore the forwarded header when no proxy is trusted`() {

        val request = request(remoteAddress = "10.0.0.1", "198.51.100.7")

        assertThat(resolver(trustedProxyCount = 0).resolve(request)).isEqualTo("10.0.0.1")
    }

    @Test
    fun `should take the address that the trusted proxy appended`() {

        val request = request(remoteAddress = "10.0.0.1", "198.51.100.7")

        assertThat(resolver(trustedProxyCount = 1).resolve(request)).isEqualTo("198.51.100.7")
    }

    @Test
    fun `should not be fooled by an address the client put at the start of the chain`() {

        val request = request(remoteAddress = "10.0.0.1", "6.6.6.6, 198.51.100.7")

        assertThat(resolver(trustedProxyCount = 1).resolve(request)).isEqualTo("198.51.100.7")
    }

    @Test
    fun `should skip as many proxies as configured`() {

        val request = request(remoteAddress = "10.0.0.2", "198.51.100.7, 10.0.0.1")

        assertThat(resolver(trustedProxyCount = 2).resolve(request)).isEqualTo("198.51.100.7")
    }

    @Test
    fun `should read every line of the forwarded header`() {

        val request = request(remoteAddress = "10.0.0.2", "6.6.6.6", "198.51.100.7, 10.0.0.1")

        assertThat(resolver(trustedProxyCount = 2).resolve(request)).isEqualTo("198.51.100.7")
    }

    @Test
    fun `should fall back to the remote address when the chain is shorter than the trusted proxies`() {

        val request = request(remoteAddress = "10.0.0.1", "198.51.100.7")

        assertThat(resolver(trustedProxyCount = 3).resolve(request)).isEqualTo("10.0.0.1")
    }

    @Test
    fun `should fall back to the remote address when there is no forwarded header`() {

        assertThat(resolver(trustedProxyCount = 1).resolve(request(remoteAddress = "10.0.0.1"))).isEqualTo("10.0.0.1")
    }

    @Test
    fun `should fall back to the remote address when the chosen entry is not an address`() {

        val request = request(remoteAddress = "10.0.0.1", "not an address, 10.0.0.9")

        assertThat(resolver(trustedProxyCount = 2).resolve(request)).isEqualTo("10.0.0.1")
        assertThat(resolver(trustedProxyCount = 1).resolve(request(remoteAddress = "10.0.0.1", "x".repeat(200))))
            .isEqualTo("10.0.0.1")
    }

    @Test
    fun `should normalize an ipv6 address to lower case`() {

        val request = request(remoteAddress = "10.0.0.1", "2001:DB8::1")

        assertThat(resolver(trustedProxyCount = 1).resolve(request)).isEqualTo("2001:db8::1")
    }

    private fun resolver(trustedProxyCount: Int) = ClientIpResolver(
        SecurityProperties(clientIp = SecurityProperties.ClientIpProperties(trustedProxyCount))
    )

    private fun request(remoteAddress: String, vararg forwardedLines: String) = MockHttpServletRequest().apply {
        this.remoteAddr = remoteAddress
        forwardedLines.forEach { line -> addHeader("X-Forwarded-For", line) }
    }
}
