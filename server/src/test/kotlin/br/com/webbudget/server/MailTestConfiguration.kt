package br.com.webbudget.server

import com.icegreen.greenmail.util.GreenMail
import com.icegreen.greenmail.util.ServerSetup
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.test.context.DynamicPropertyRegistrar

@TestConfiguration(proxyBeanMethods = false)
class MailTestConfiguration {

    @Bean(initMethod = "start", destroyMethod = "stop")
    fun greenMail(): GreenMail = GreenMail(ServerSetup(0, "127.0.0.1", ServerSetup.PROTOCOL_SMTP))
        .also { it.setUser(MAIL_USER, MAIL_PASSWORD) }

    @Bean
    fun mailPropertiesRegistrar(greenMail: GreenMail): DynamicPropertyRegistrar = DynamicPropertyRegistrar { registry ->
        registry.add("spring.mail.host") { "127.0.0.1" }
        registry.add("spring.mail.username") { MAIL_USER }
        registry.add("spring.mail.password") { MAIL_PASSWORD }
        registry.add("spring.mail.port") { greenMail.smtp.port }
    }

    companion object {
        private const val MAIL_USER = "maildev"
        private const val MAIL_PASSWORD = "maildev"
    }
}
