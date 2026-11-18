package br.com.webbudget.server.infrastructure.config.security

object AttemptKeys {

    private const val SEPARATOR = "|"

    fun of(email: String, clientIp: String): String = "${email.trim().lowercase()}$SEPARATOR$clientIp"
}
