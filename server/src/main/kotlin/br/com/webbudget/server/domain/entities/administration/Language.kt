package br.com.webbudget.server.domain.entities.administration

import java.util.Locale

enum class Language(val text: String) {
    EN_US("en_US"), PT_BR("pt_BR");

    val locale: Locale = Locale.forLanguageTag(text.replace('_', '-'))
}
