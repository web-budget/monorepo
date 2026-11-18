package br.com.webbudget.server.domain.services.administration

import br.com.webbudget.server.domain.entities.administration.TrustedDevice
import br.com.webbudget.server.domain.exceptions.ResourceNotFoundException
import br.com.webbudget.server.domain.security.CurrentUserProvider
import br.com.webbudget.server.infrastructure.config.security.SecurityProperties
import br.com.webbudget.server.infrastructure.repository.administration.TrustedDeviceRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.LocalDateTime
import java.util.Base64
import java.util.HexFormat
import java.util.UUID

@Service
@Transactional(readOnly = true)
class TrustedDeviceService(
    private val trustedDeviceRepository: TrustedDeviceRepository,
    private val currentUserProvider: CurrentUserProvider,
    private val securityProperties: SecurityProperties
) {

    private val secureRandom = SecureRandom()

    @Transactional
    fun isTrusted(userId: Long, request: HttpServletRequest): Boolean {

        val token = request.cookies?.firstOrNull { it.name == COOKIE_NAME }?.value ?: return false

        val now = LocalDateTime.now()

        val device = trustedDeviceRepository.findValidByTokenHashAndUserId(hash(token), userId, now) ?: return false

        trustedDeviceRepository.touch(device.id!!, now)

        return true
    }

    @Transactional
    fun trust(userId: Long, request: HttpServletRequest, response: HttpServletResponse) {

        val expiry = securityProperties.trustedDevice.expiry
        val now = LocalDateTime.now()
        val token = generateToken()

        trustedDeviceRepository.deleteExpiredByUserId(userId, now)
        trustedDeviceRepository.insert(
            userId = userId,
            tokenHash = hash(token),
            label = DeviceLabel.from(request.getHeader(HttpHeaders.USER_AGENT)),
            expiresOn = now.plus(expiry),
            now = now
        )

        val cookie = ResponseCookie.from(COOKIE_NAME, token)
            .httpOnly(true)
            .secure(request.isSecure)
            .sameSite(SAME_SITE_LAX)
            .path(COOKIE_PATH)
            .maxAge(expiry)
            .build()

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString())
    }

    fun findAllOfCurrentUser(): List<TrustedDevice> =
        trustedDeviceRepository.findValidByUserId(currentUserProvider.getSessionUser().id, LocalDateTime.now())

    @Transactional
    fun revoke(externalId: UUID) {

        val deleted = trustedDeviceRepository.deleteByExternalIdAndUserId(externalId, currentUserProvider.getSessionUser().id)

        if (deleted == 0) {
            throw ResourceNotFoundException()
        }
    }

    @Transactional
    fun revokeAllOfCurrentUser() {
        trustedDeviceRepository.deleteByUserId(currentUserProvider.getSessionUser().id)
    }

    private fun generateToken(): String {
        val bytes = ByteArray(TOKEN_BYTES)
        secureRandom.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun hash(token: String): String =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.toByteArray(Charsets.UTF_8)))

    companion object {
        const val COOKIE_NAME = "trusted_device"
        const val COOKIE_PATH = "/private/v1/auth"

        private const val SAME_SITE_LAX = "Lax"
        private const val TOKEN_BYTES = 32
    }
}
