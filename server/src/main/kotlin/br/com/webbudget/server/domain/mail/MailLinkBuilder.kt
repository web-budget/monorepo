package br.com.webbudget.server.domain.mail

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.util.UriComponentsBuilder

@Component
class MailLinkBuilder(
    @param:Value($$"${web-budget.frontend-url}")
    private val frontendUrl: String
) {

    fun build(path: String, queryParameters: Map<String, String> = emptyMap()): String {

        val builder = UriComponentsBuilder.fromUriString(frontendUrl).path(path)

        queryParameters.keys.forEach { name -> builder.queryParam(name, "{$name}") }

        return builder.encode().buildAndExpand(queryParameters).toUriString()
    }
}
