package br.com.webbudget.server.infrastructure.config.security

import org.springframework.stereotype.Component
import java.security.SecureRandom
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class PendingGoogleLink(
    val userExternalId: UUID,
    val googleSub: String,
    val expiresAt: Instant
)

@Component
class GoogleLinkTokenStore(
    private val clock: Clock
) {

    private val secureRandom = SecureRandom()

    private val pendingLinks = ConcurrentHashMap<String, PendingGoogleLink>()

    fun issue(userExternalId: UUID, googleSub: String): String {

        val now = clock.instant()

        pendingLinks.values.removeIf { it.expiresAt.isBefore(now) }

        val token = generateToken()

        pendingLinks[token] = PendingGoogleLink(userExternalId, googleSub, now.plus(TOKEN_VALIDITY))

        return token
    }

    fun peek(token: String): PendingGoogleLink? = pendingLinks[token]?.takeIf { it.expiresAt.isAfter(clock.instant()) }

    fun consume(token: String): PendingGoogleLink? =
        pendingLinks.remove(token)?.takeIf { it.expiresAt.isAfter(clock.instant()) }

    fun burn(token: String) {
        pendingLinks.remove(token)
    }

    private fun generateToken(): String {
        val bytes = ByteArray(TOKEN_BYTES)
        secureRandom.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    companion object {
        private val TOKEN_VALIDITY = Duration.ofMinutes(10)
        private const val TOKEN_BYTES = 32
    }
}
