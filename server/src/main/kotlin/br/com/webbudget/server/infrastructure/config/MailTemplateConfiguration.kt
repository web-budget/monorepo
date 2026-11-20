package br.com.webbudget.server.infrastructure.config

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.MessageSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.support.ResourceBundleMessageSource
import org.thymeleaf.TemplateEngine
import org.thymeleaf.spring6.dialect.SpringStandardDialect
import org.thymeleaf.spring6.messageresolver.SpringMessageResolver
import org.thymeleaf.templatemode.TemplateMode
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver
import java.nio.charset.StandardCharsets.UTF_8

@Configuration(proxyBeanMethods = false)
class MailTemplateConfiguration {

    @Bean
    fun mailMessageSource(): MessageSource = ResourceBundleMessageSource().apply {
        setBasename("mail/messages")
        setDefaultEncoding(UTF_8.name())
        setFallbackToSystemLocale(false)
    }

    @Bean
    fun mailTemplateEngine(@Qualifier("mailMessageSource") mailMessageSource: MessageSource): TemplateEngine {

        val templateResolver = ClassLoaderTemplateResolver().apply {
            prefix = "templates/mail/"
            suffix = ".html"
            templateMode = TemplateMode.HTML
            characterEncoding = UTF_8.name()
        }

        val messageResolver = SpringMessageResolver().apply { setMessageSource(mailMessageSource) }

        return TemplateEngine().apply {
            setTemplateResolver(templateResolver)
            setMessageResolver(messageResolver)
            setDialect(SpringStandardDialect())
        }
    }
}
