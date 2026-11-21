package br.com.webbudget.server.application.payloads

object ErrorCodes {
    const val IS_NULL = "is-null"
    const val IS_EMPTY = "is-empty"
    const val IS_NULL_OR_BLANK = "is-null-or-blank"
    const val MAX_CHARS = "has-max-chars-of-{max}"
    const val EMAIL_IS_INVALID = "email-address-is-invalid"
    const val HAS_CONTROL_CHARACTERS = "has-control-characters"
    const val MAX_BYTES = "has-max-bytes-of-{max}"
    const val IS_NOT_POSITIVE = "is-not-positive"
    const val IS_NEGATIVE = "is-negative"
}
