package br.com.webbudget.server.domain.security

interface CurrentUserProvider {

    fun getCurrentUser(): CurrentUser

    fun getSessionUser(): CurrentUser
}
