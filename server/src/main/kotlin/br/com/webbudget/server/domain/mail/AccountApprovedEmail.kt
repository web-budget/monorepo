package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.entities.administration.Language.EN_US
import br.com.webbudget.server.domain.entities.administration.User

class AccountApprovedEmail(user: User) : MailTemplate(
    "account-approved-${user.defaultLanguage.text}",
    if (user.defaultLanguage == EN_US) SUBJECT_EN else SUBJECT_PT,
    listOf(user.email)
) {

    init {
        super.addVariable("user", user.name)
    }

    companion object {
        private const val SUBJECT_EN = "Your account was approved"
        private const val SUBJECT_PT = "Sua conta foi aprovada"
    }
}
