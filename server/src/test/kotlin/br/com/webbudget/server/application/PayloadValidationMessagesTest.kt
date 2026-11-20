package br.com.webbudget.server.application

import br.com.webbudget.server.application.payloads.ErrorCodes
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider
import org.springframework.core.type.filter.AssignableTypeFilter
import java.lang.reflect.AnnotatedElement

class PayloadValidationMessagesTest {

    private val allowedMessages = ErrorCodes::class.java.declaredFields
        .filter { it.type == String::class.java }
        .map { it.apply { isAccessible = true }.get(null) as String }
        .toSet()

    @Test
    fun `should use only error codes as the message of the validation annotations in the payloads`() {

        val payloads = findPayloadClasses()
        assertThat(payloads.map { it.simpleName }).contains("UserCreateForm", "ForgotPasswordForm")

        val invalid = payloads.flatMap { findInvalidMessages(it) }

        assertThat(invalid)
            .describedAs("validation annotations whose message is not a constant of payloads.ErrorCodes")
            .isEmpty()
    }

    @Test
    fun `should find a validation annotation with a loose text as message`() {

        val invalid = findInvalidMessages(LooseMessagePayload::class.java)

        assertThat(invalid).containsExactlyInAnyOrder(
            "LooseMessagePayload.email: @Email(is-not-valid)",
            "LooseMessagePayload.name: @NotBlank({jakarta.validation.constraints.NotBlank.message})"
        )
    }

    private fun findPayloadClasses(): List<Class<*>> {
        val scanner = object : ClassPathScanningCandidateComponentProvider(false) {
            override fun isCandidateComponent(beanDefinition: AnnotatedBeanDefinition) = true
        }
        scanner.addIncludeFilter(AssignableTypeFilter(Any::class.java))

        return scanner.findCandidateComponents(PAYLOADS_PACKAGE)
            .mapNotNull { it.beanClassName }
            .map { Class.forName(it) }
    }

    private fun findInvalidMessages(type: Class<*>): List<String> {
        val elements: List<AnnotatedElement> = type.declaredFields.toList() +
            type.declaredMethods +
            type.declaredConstructors.flatMap { it.parameters.toList() }

        return elements.flatMap { element ->
            element.annotations.mapNotNull { annotation ->
                val annotationType = annotation.annotationClass.java
                val isConstraint = annotationType.declaredMethods.map { it.name }
                    .containsAll(listOf("message", "groups", "payload"))
                val message = if (isConstraint) annotationType.getMethod("message").invoke(annotation) else null
                if (message != null && message !in allowedMessages) {
                    "${type.simpleName}.${nameOf(element)}: @${annotationType.simpleName}($message)"
                } else null
            }
        }
    }

    private fun nameOf(element: AnnotatedElement) = when (element) {
        is java.lang.reflect.Member -> element.name
        is java.lang.reflect.Parameter -> element.name
        else -> element.toString()
    }

    private data class LooseMessagePayload(
        @field:NotBlank
        val name: String?,
        @field:Email(message = "is-not-valid")
        @field:NotBlank(message = ErrorCodes.IS_NULL_OR_BLANK)
        val email: String?
    )

    private companion object {
        const val PAYLOADS_PACKAGE = "br.com.webbudget.server.application.payloads"
    }
}
