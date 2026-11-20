package br.com.webbudget.server.domain.mail

import java.util.Locale

data class MailMessage(
    val to: List<String>,
    val templateName: String,
    val locale: Locale,
    val variables: Map<String, Any?> = emptyMap(),
    val subjectArgs: List<Any> = emptyList()
)
