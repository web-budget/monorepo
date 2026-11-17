package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.domain.security.CurrentUser
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority

const val STATUS_AUTHORITY_PREFIX = "STATUS_"

fun CurrentUser.toAuthorities(): List<GrantedAuthority> =
    roles.map { SimpleGrantedAuthority("ROLE_$it") } + SimpleGrantedAuthority("$STATUS_AUTHORITY_PREFIX$status")
