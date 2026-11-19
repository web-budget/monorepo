package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.entities.administration.Language.EN_US
import br.com.webbudget.server.domain.entities.administration.User

class UserPendingApprovalEmail(administrator: User, newUser: User) : MailTemplate(
    "user-pending-approval-${administrator.defaultLanguage.text}",
    if (administrator.defaultLanguage == EN_US) SUBJECT_EN else SUBJECT_PT,
    listOf(administrator.email)
) {

    init {
        super.addVariable("user", administrator.name)
        super.addVariable("newUserName", newUser.name)
        super.addVariable("newUserEmail", newUser.email)
    }

    companion object {
        private const val SUBJECT_EN = "New user waiting for approval"
        private const val SUBJECT_PT = "Novo usuário aguardando aprovação"
    }
}
