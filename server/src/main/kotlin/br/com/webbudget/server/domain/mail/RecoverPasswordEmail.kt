package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.entities.administration.Language.EN_US
import br.com.webbudget.server.domain.entities.administration.User

class RecoverPasswordEmail(user: User) : MailTemplate(
    "recover-password-${user.defaultLanguage.text}",
    if (user.defaultLanguage == EN_US) SUBJECT_EN else SUBJECT_PT,
    listOf(user.email)
) {

    init {
        super.addVariable("user", user.name)
    }

    companion object {
        private const val SUBJECT_EN = "Password recovery"
        private const val SUBJECT_PT = "Recuperação de senha"
    }
}
