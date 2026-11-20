package br.com.webbudget.server.domain.mail

import br.com.webbudget.server.domain.services.MailSenderService
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener

@Component
class MailRequestedListener(
    private val mailSender: MailSender,
    private val mailSenderService: MailSenderService
) {

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    fun onMailMessageRequested(event: MailMessageRequested) {
        mailSender.send(event.message)
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    fun onMailRequested(event: MailRequested) {
        mailSenderService.sendEmail(event.template)
    }
}
