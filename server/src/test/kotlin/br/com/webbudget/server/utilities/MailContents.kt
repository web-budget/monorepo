package br.com.webbudget.server.utilities

import jakarta.mail.Part
import jakarta.mail.internet.MimeMessage
import jakarta.mail.internet.MimeMultipart

data class MailContents(val plainText: String?, val html: String, val multipartTypes: List<String>)

fun MimeMessage.contents(): MailContents {

    val parts = generateSequence(listOf<Part>(this)) { current ->
        current.flatMap { part -> childrenOf(part) }.ifEmpty { null }
    }.flatten().toList()

    return MailContents(
        plainText = parts.firstOrNull { it.isMimeType("text/plain") }?.content as String?,
        html = parts.first { it.isMimeType("text/html") }.content as String,
        multipartTypes = parts.filter { it.isMimeType("multipart/*") }
            .map { it.contentType.substringBefore(';').trim().lowercase() }
    )
}

private fun childrenOf(part: Part): List<Part> {

    val content = part.content

    return if (content is MimeMultipart) (0 until content.count).map { index -> content.getBodyPart(index) } else emptyList()
}
