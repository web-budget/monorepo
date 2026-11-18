package br.com.webbudget.server.domain.services.administration

import dev.samstevens.totp.code.CodeVerifier
import dev.samstevens.totp.code.DefaultCodeGenerator
import dev.samstevens.totp.code.DefaultCodeVerifier
import dev.samstevens.totp.code.HashingAlgorithm
import dev.samstevens.totp.qr.QrData
import dev.samstevens.totp.qr.QrGenerator
import dev.samstevens.totp.qr.ZxingPngQrGenerator
import dev.samstevens.totp.secret.DefaultSecretGenerator
import dev.samstevens.totp.secret.SecretGenerator
import dev.samstevens.totp.time.SystemTimeProvider
import dev.samstevens.totp.util.Utils.getDataUriForImage
import org.springframework.stereotype.Service

@Service
class TotpService {

    private val secretGenerator: SecretGenerator = DefaultSecretGenerator()
    private val codeVerifier: CodeVerifier = DefaultCodeVerifier(DefaultCodeGenerator(), SystemTimeProvider())
    private val qrGenerator: QrGenerator = ZxingPngQrGenerator()

    fun generateSecret(): String = secretGenerator.generate()

    fun isCodeValid(secret: String, code: String): Boolean = codeVerifier.isValidCode(secret, code)

    fun qrCodeDataUri(email: String, secret: String): String {

        val data = QrData.Builder()
            .label(email)
            .secret(secret)
            .issuer(ISSUER)
            .algorithm(HashingAlgorithm.SHA1)
            .digits(DIGITS)
            .period(PERIOD_IN_SECONDS)
            .build()

        return getDataUriForImage(qrGenerator.generate(data), qrGenerator.imageMimeType)
    }

    companion object {
        private const val ISSUER = "webBudget"
        private const val DIGITS = 6
        private const val PERIOD_IN_SECONDS = 30
    }
}
