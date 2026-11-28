package br.com.webbudget.server.domain.exceptions

import br.com.webbudget.server.domain.exceptions.ErrorCodes.MAIL_ENCRYPTION_KEY_MISSING
import br.com.webbudget.server.domain.exceptions.ErrorCodes.MAIL_NOT_CONFIGURED

class MailNotConfiguredException : DomainException(
    "The mail server must be saved before this operation",
    MAIL_NOT_CONFIGURED
)

class MailEncryptionKeyMissingException : DomainException(
    "MAIL_ENCRYPTION_KEY must be set to save the mail server password",
    MAIL_ENCRYPTION_KEY_MISSING
)
