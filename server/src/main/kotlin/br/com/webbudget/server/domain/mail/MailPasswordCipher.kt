package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.exceptions.MailEncryptionKeyMissingException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

@Component
class MailPasswordCipher(
    @param:Value($$"${web-budget.mail.encryption-key}")
    encryptionKey: String
) {

    private val key: SecretKey? = parseKey(encryptionKey)

    private val secureRandom = SecureRandom()

    fun isAvailable(): Boolean = key != null

    fun encrypt(password: String): String {

        val initializationVector = ByteArray(INITIALIZATION_VECTOR_LENGTH).also(secureRandom::nextBytes)

        val cipher = Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.ENCRYPT_MODE, requireKey(), GCMParameterSpec(TAG_LENGTH_BITS, initializationVector))
        }

        return Base64.getEncoder()
            .encodeToString(initializationVector + cipher.doFinal(password.toByteArray(Charsets.UTF_8)))
    }

    fun decrypt(ciphertext: String): String {

        val bytes = Base64.getDecoder().decode(ciphertext)

        val cipher = Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.DECRYPT_MODE, requireKey(), GCMParameterSpec(TAG_LENGTH_BITS, bytes, 0, INITIALIZATION_VECTOR_LENGTH))
        }

        val plain = cipher.doFinal(bytes, INITIALIZATION_VECTOR_LENGTH, bytes.size - INITIALIZATION_VECTOR_LENGTH)

        return String(plain, Charsets.UTF_8)
    }

    private fun requireKey(): SecretKey = key ?: throw MailEncryptionKeyMissingException()

    companion object {

        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val KEY_LENGTH = 32
        private const val INITIALIZATION_VECTOR_LENGTH = 12
        private const val TAG_LENGTH_BITS = 128

        private fun parseKey(encodedKey: String): SecretKey? {

            if (encodedKey.isBlank()) {
                return null
            }

            val keyBytes = runCatching { Base64.getDecoder().decode(encodedKey.trim()) }
                .getOrElse {
                    throw IllegalStateException("web-budget.mail.encryption-key (MAIL_ENCRYPTION_KEY) is not valid base64", it)
                }

            check(keyBytes.size == KEY_LENGTH) {
                "web-budget.mail.encryption-key (MAIL_ENCRYPTION_KEY) must decode to $KEY_LENGTH bytes, not ${keyBytes.size}"
            }

            return SecretKeySpec(keyBytes, "AES")
        }
    }
}
