package br.com.webbudget.server.domain.exceptions

import org.springframework.security.access.AccessDeniedException

class UserNotApprovedException(email: String) : AccessDeniedException("The user [$email] is not approved")
