package br.com.webbudget.server

import com.icegreen.greenmail.util.GreenMail
import com.icegreen.greenmail.util.ServerSetup
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean

@TestConfiguration(proxyBeanMethods = false)
class MailTestConfiguration {

    @Bean(initMethod = "start", destroyMethod = "stop")
    fun greenMail(): GreenMail = GreenMail(ServerSetup(0, "127.0.0.1", ServerSetup.PROTOCOL_SMTP))
        .also { it.setUser(MAIL_USER, MAIL_PASSWORD) }

    companion object {
        const val MAIL_USER = "maildev"
        const val MAIL_PASSWORD = "maildev"
    }
}
