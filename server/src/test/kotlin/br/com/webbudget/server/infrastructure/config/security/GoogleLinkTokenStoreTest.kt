package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.utilities.MutableClock
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Duration
import java.util.UUID

class GoogleLinkTokenStoreTest {

    private val clock = MutableClock()

    private val store = GoogleLinkTokenStore(clock)

    private val userExternalId = UUID.randomUUID()

    @Test
    fun `should issue a different unguessable token every time`() {

        val first = store.issue(userExternalId, "sub-1")
        val second = store.issue(userExternalId, "sub-1")

        assertThat(first).isNotEqualTo(second).hasSizeGreaterThanOrEqualTo(43)
    }

    @Test
    fun `should bind the token to the account and the google identity`() {

        val token = store.issue(userExternalId, "sub-1")

        val pending = store.peek(token)!!

        assertThat(pending.userExternalId).isEqualTo(userExternalId)
        assertThat(pending.googleSub).isEqualTo("sub-1")
    }

    @Test
    fun `should let a token be peeked many times but consumed only once`() {

        val token = store.issue(userExternalId, "sub-1")

        assertThat(store.peek(token)).isNotNull()
        assertThat(store.peek(token)).isNotNull()
        assertThat(store.consume(token)).isNotNull()
        assertThat(store.consume(token)).isNull()
        assertThat(store.peek(token)).isNull()
    }

    @Test
    fun `should forget a burned token`() {

        val token = store.issue(userExternalId, "sub-1")

        store.burn(token)

        assertThat(store.peek(token)).isNull()
        assertThat(store.consume(token)).isNull()
    }

    @Test
    fun `should not know an unknown token`() {

        assertThat(store.peek("unknown")).isNull()
        assertThat(store.consume("unknown")).isNull()
    }

    @Test
    fun `should not accept a token after ten minutes`() {

        val token = store.issue(userExternalId, "sub-1")

        clock.advance(Duration.ofMinutes(9))
        assertThat(store.peek(token)).isNotNull()

        clock.advance(Duration.ofMinutes(1))
        assertThat(store.peek(token)).isNull()
        assertThat(store.consume(token)).isNull()
    }

    @Test
    fun `should drop the expired tokens when issuing a new one`() {

        val expired = store.issue(userExternalId, "sub-1")

        clock.advance(Duration.ofMinutes(11))

        val fresh = store.issue(userExternalId, "sub-2")

        assertThat(store.consume(expired)).isNull()
        assertThat(store.consume(fresh)).isNotNull()
    }
}
