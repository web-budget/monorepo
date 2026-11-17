package br.com.webbudget.server.infrastructure.config

import com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import tools.jackson.core.JsonParser
import tools.jackson.databind.DeserializationContext
import tools.jackson.databind.DeserializationFeature
import tools.jackson.databind.SerializationFeature
import tools.jackson.databind.cfg.EnumFeature
import tools.jackson.databind.deser.std.StdDeserializer
import tools.jackson.databind.module.SimpleModule
import tools.jackson.module.kotlin.KotlinFeature.NullIsSameAsDefault
import tools.jackson.module.kotlin.KotlinModule

@Configuration(proxyBeanMethods = false)
class JacksonConfiguration {

    @Bean
    fun configureObjectMapper(): JsonMapperBuilderCustomizer {

        val simpleModule = SimpleModule()
            .addDeserializer(String::class.java, TrimmedStringDeserializer())

        val kotlinModule = KotlinModule.Builder()
            .configure(NullIsSameAsDefault, true)
            .build()

        return JsonMapperBuilderCustomizer { builder ->
            builder
                .addModule(kotlinModule)
                .addModule(simpleModule)
                .changeDefaultPropertyInclusion { include -> include.withValueInclusion(NON_NULL) }
                .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS)
                .disable(
                    DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES,
                    DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES
                )
                .enable(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT)
                .enable(EnumFeature.READ_UNKNOWN_ENUM_VALUES_AS_NULL)
        }
    }

    class TrimmedStringDeserializer : StdDeserializer<String>(String::class.java) {

        override fun deserialize(parser: JsonParser?, context: DeserializationContext?): String? =
            parser?.valueAsString?.trim()?.ifEmpty { null }
    }
}
