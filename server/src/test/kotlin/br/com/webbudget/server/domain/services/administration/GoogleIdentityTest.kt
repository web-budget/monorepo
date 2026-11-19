package br.com.webbudget.server.domain.services.administration

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class GoogleIdentityTest {

    @Test
    fun `should use the name that google sent`() {
        assertThat(GoogleIdentity("sub", "ana@example.com", "Ana Souza").displayName()).isEqualTo("Ana Souza")
    }

    @Test
    fun `should replace control characters and trim the name`() {
        assertThat(GoogleIdentity("sub", "ana@example.com", "  Ana\nSouza  ").displayName()).isEqualTo("Ana Souza")
    }

    @Test
    fun `should cut the name at the column limit`() {
        assertThat(GoogleIdentity("sub", "ana@example.com", "a".repeat(150)).displayName()).hasSize(100)
    }

    @Test
    fun `should fall back to the e-mail user when the name is missing or blank`() {
        assertThat(GoogleIdentity("sub", "ana@example.com", null).displayName()).isEqualTo("ana")
        assertThat(GoogleIdentity("sub", "ana@example.com", " \n ").displayName()).isEqualTo("ana")
    }
}
