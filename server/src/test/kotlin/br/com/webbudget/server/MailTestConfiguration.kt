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

    @Bean
    fun mailPropertiesRegistrar(greenMail: GreenMail): DynamicPropertyRegistrar = DynamicPropertyRegistrar { registry ->
        registry.add("spring.mail.host") { "127.0.0.1" }
        registry.add("spring.mail.port") { greenMail.smtp.port }
    }
}
