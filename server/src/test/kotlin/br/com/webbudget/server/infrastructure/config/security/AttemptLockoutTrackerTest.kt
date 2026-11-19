package br.com.webbudget.server.infrastructure.config.security

import br.com.webbudget.server.utilities.MutableClock
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Duration

class AttemptLockoutTrackerTest {

    private val clock = MutableClock()

    @Test
    fun `should not lock before reaching the maximum of attempts`() {

        val tracker = tracker(maxAttempts = 3)

        repeat(2) { tracker.recordFailure(KEY) }

        assertThat(tracker.lockedUntil(KEY)).isNull()
    }

    @Test
    fun `should lock on the maximum of attempts and unlock when the base duration ends`() {

        val tracker = tracker(maxAttempts = 3)

        repeat(3) { tracker.recordFailure(KEY) }

        assertThat(tracker.lockedUntil(KEY)).isEqualTo(clock.instant().plus(BASE_DURATION))

        clock.advance(BASE_DURATION.plusSeconds(1))

        assertThat(tracker.lockedUntil(KEY)).isNull()
    }

    @Test
    fun `should double the lock on every new lockout up to the cap`() {

        val tracker = tracker(maxAttempts = 1)

        (0..7).forEach { lockout ->

            tracker.recordFailure(KEY)

            val expectedMultiplier = 1L shl lockout.coerceAtMost(5)

            assertThat(tracker.lockedUntil(KEY)).isEqualTo(clock.instant().plus(BASE_DURATION.multipliedBy(expectedMultiplier)))

            clock.advance(BASE_DURATION.multipliedBy(expectedMultiplier).plusSeconds(1))
        }
    }

    @Test
    fun `should count the failures of each key apart`() {

        val tracker = tracker(maxAttempts = 2)

        tracker.recordFailure(KEY)
        tracker.recordFailure(OTHER_KEY)

        assertThat(tracker.lockedUntil(KEY)).isNull()
        assertThat(tracker.lockedUntil(OTHER_KEY)).isNull()

        tracker.recordFailure(KEY)

        assertThat(tracker.lockedUntil(KEY)).isNotNull()
        assertThat(tracker.lockedUntil(OTHER_KEY)).isNull()
    }

    @Test
    fun `should forget the failures after a success`() {

        val tracker = tracker(maxAttempts = 2)

        tracker.recordFailure(KEY)
        tracker.recordSuccess(KEY)
        tracker.recordFailure(KEY)

        assertThat(tracker.lockedUntil(KEY)).isNull()
    }

    @Test
    fun `should forget the failures that are older than the failure window`() {

        val tracker = tracker(maxAttempts = 2, failureWindow = Duration.ofMinutes(10))

        tracker.recordFailure(KEY)
        clock.advance(Duration.ofMinutes(11))
        tracker.recordFailure(KEY)

        assertThat(tracker.lockedUntil(KEY)).isNull()

        tracker.recordFailure(KEY)

        assertThat(tracker.lockedUntil(KEY)).isNotNull()
    }

    @Test
    fun `should keep counting without a failure window until the retention ends`() {

        val tracker = tracker(maxAttempts = 2)

        tracker.recordFailure(KEY)
        clock.advance(Duration.ofMinutes(50))
        tracker.recordFailure(KEY)

        assertThat(tracker.lockedUntil(KEY)).isNotNull()
    }

    @Test
    fun `should purge the stale states and keep the locked ones`() {

        val tracker = tracker(maxAttempts = 2, baseDuration = Duration.ofHours(3))

        tracker.recordFailure(STALE_KEY)
        repeat(2) { tracker.recordFailure(KEY) }

        clock.advance(Duration.ofHours(1).plusMinutes(5))

        tracker.recordFailure(OTHER_KEY)

        assertThat(tracker.trackedKeyCount()).isEqualTo(2)
        assertThat(tracker.lockedUntil(KEY)).isNotNull()

        clock.advance(Duration.ofHours(3))

        tracker.recordFailure(OTHER_KEY)

        assertThat(tracker.trackedKeyCount()).isEqualTo(1)
    }

    @Test
    fun `should skip the purge while the interval did not pass`() {

        val tracker = tracker(maxAttempts = 5)

        tracker.recordFailure(STALE_KEY)

        clock.advance(Duration.ofHours(2))
        tracker.recordFailure(KEY)

        assertThat(tracker.trackedKeyCount()).isEqualTo(1)

        tracker.recordFailure(STALE_KEY)
        tracker.recordFailure(OTHER_KEY)
        clock.advance(Duration.ofSeconds(10))
        tracker.recordFailure(OTHER_KEY)

        assertThat(tracker.trackedKeyCount()).isEqualTo(3)
    }

    private fun tracker(
        maxAttempts: Int,
        failureWindow: Duration? = null,
        baseDuration: Duration = BASE_DURATION
    ) = AttemptLockoutTracker(
        maxAttempts = maxAttempts,
        baseDuration = baseDuration,
        clock = clock,
        failureWindow = failureWindow
    )

    companion object {
        private const val KEY = "user@webbudget.com.br|203.0.113.1"
        private const val OTHER_KEY = "other@webbudget.com.br|203.0.113.2"
        private const val STALE_KEY = "stale@webbudget.com.br|203.0.113.3"
        private val BASE_DURATION: Duration = Duration.ofSeconds(60)
    }
}
