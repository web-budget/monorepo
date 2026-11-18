package br.com.webbudget.server.application.payloads

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

@MustBeDocumented
@Target(AnnotationTarget.FIELD)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [MaxUtf8BytesValidator::class])
annotation class MaxUtf8Bytes(
    val max: Int,
    val message: String = ErrorCodes.MAX_BYTES,
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = []
)

class MaxUtf8BytesValidator : ConstraintValidator<MaxUtf8Bytes, String?> {

    private var max = 0

    override fun initialize(constraintAnnotation: MaxUtf8Bytes) {
        max = constraintAnnotation.max
    }

    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean =
        value == null || value.toByteArray(Charsets.UTF_8).size <= max
}
