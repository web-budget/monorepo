package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.exceptions.MailEncryptionKeyMissingException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatCode
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.util.Base64

class MailPasswordCipherTest {

    private val validKey = Base64.getEncoder().encodeToString(ByteArray(32) { it.toByte() })

    @Test
    fun `should decrypt what it encrypted`() {

        val cipher = MailPasswordCipher(validKey)

        assertThat(cipher.isAvailable()).isTrue()
        assertThat(cipher.decrypt(cipher.encrypt("p@ssw0rd çãõ"))).isEqualTo("p@ssw0rd çãõ")
    }

    @Test
    fun `should produce a different ciphertext for the same password`() {

        val cipher = MailPasswordCipher(validKey)

        assertThat(cipher.encrypt("p@ssw0rd")).isNotEqualTo(cipher.encrypt("p@ssw0rd"))
    }

    @Test
    fun `should decrypt with another instance of the same key`() {

        assertThat(MailPasswordCipher(validKey).decrypt(MailPasswordCipher(validKey).encrypt("p@ssw0rd")))
            .isEqualTo("p@ssw0rd")
    }

    @Test
    fun `should be unavailable and refuse to encrypt without a key`() {

        for (key in listOf("", "   ")) {

            val cipher = MailPasswordCipher(key)

            assertThat(cipher.isAvailable()).isFalse()
            assertThatThrownBy { cipher.encrypt("p@ssw0rd") }
                .isInstanceOf(MailEncryptionKeyMissingException::class.java)
                .hasFieldOrPropertyWithValue("error", "mail-encryption-key-missing")
        }
    }

    @Test
    fun `should refuse to decrypt without a key`() {

        val ciphertext = MailPasswordCipher(validKey).encrypt("p@ssw0rd")

        assertThatThrownBy { MailPasswordCipher("").decrypt(ciphertext) }
            .isInstanceOf(MailEncryptionKeyMissingException::class.java)
    }

    @Test
    fun `should fail to start with a key that is not base64`() {

        assertThatThrownBy { MailPasswordCipher("not base64 !!") }
            .isInstanceOf(IllegalStateException::class.java)
            .hasMessageContaining("MAIL_ENCRYPTION_KEY")
    }

    @Test
    fun `should fail to start with a key of the wrong size`() {

        for (size in listOf(16, 31, 33)) {
            assertThatThrownBy { MailPasswordCipher(Base64.getEncoder().encodeToString(ByteArray(size))) }
                .isInstanceOf(IllegalStateException::class.java)
                .hasMessageContaining("MAIL_ENCRYPTION_KEY")
        }
    }

    @Test
    fun `should accept a key with spaces around it`() {

        assertThatCode { MailPasswordCipher("  $validKey  ") }.doesNotThrowAnyException()
    }
}
