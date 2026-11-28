package br.com.webbudget.server.domain.entities.administration

import java.time.LocalDateTime

class MailSettings(
    var enabled: Boolean = false,
    var host: String? = null,
    var port: Int? = null,
    var security: MailSecurity = MailSecurity.STARTTLS,
    var username: String? = null,
    var passwordCiphertext: String? = null,
    var fromAddress: String? = null,
    var fromName: String? = null,
    var replyToAddress: String? = null,
    var lastUpdate: LocalDateTime? = null
) {

    fun isConfigured(): Boolean = host != null && port != null && fromAddress != null

    fun hasPassword(): Boolean = passwordCiphertext != null
}
