package br.com.webbudget.server

import org.springframework.test.context.TestPropertySource

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@TestPropertySource(
    properties = [
        "web-budget.security.totp.required=true",
        "web-budget.security.totp.lockout.max-attempts=3",
        "web-budget.security.ip-lockout.max-attempts=5",
        "web-budget.google-auth.enabled=true",
        "web-budget.google-auth.client-id=test-google-client-id",
        "web-budget.google-auth.client-secret=test-google-client-secret",
        "web-budget.google-auth.client-base-url=http://client.test"
    ]
)
annotation class TotpAndGoogleEnabled
