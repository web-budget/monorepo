package br.com.webbudget.server.domain.exceptions

object ErrorCodes {
    const val INVALID_TOKEN = "invalid-token"
    const val FIELD_VALIDATION_FAILED = "field-validation-failed"
    const val RESOURCE_NOT_FOUND = "resource-not-found"
    const val CONFLICTING_PROPERTIES = "conflicting-properties"
    const val CONCURRENT_UPDATE = "concurrent-update"
    const val BAD_REQUEST = "bad-request"
    const val DATA_INTEGRITY_VIOLATION = "data-integrity-violation"
    const val INTERNAL_ERROR = "internal-error"
}
