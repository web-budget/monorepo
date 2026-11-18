package br.com.webbudget.server.infrastructure.config.security

import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference

class AttemptLockoutTracker(
    private val maxAttempts: Int,
    private val baseDuration: Duration,
    private val clock: Clock,
    private val failureWindow: Duration? = null
) {

    private val attemptStateByKey = ConcurrentHashMap<String, AttemptState>()
    private val lastPurgeAt = AtomicReference(clock.instant())
    private val retention = (failureWindow ?: Duration.ZERO).coerceAtLeast(MINIMUM_RETENTION)

    fun lockedUntil(key: String): Instant? {
        val lockedUntil = attemptStateByKey[key]?.lockedUntil ?: return null
        return lockedUntil.takeIf { clock.instant().isBefore(it) }
    }

    fun recordFailure(key: String) {

        val now = clock.instant()

        purgeStaleStates(now)

        attemptStateByKey.compute(key) { _, existingState ->

            val failureCount = existingState.freshFailureCount(now) + 1

            if (failureCount < maxAttempts) {
                AttemptState(
                    failureCount = failureCount,
                    lockoutCount = existingState?.lockoutCount ?: 0,
                    lockedUntil = existingState?.lockedUntil,
                    lastFailureAt = now
                )
            } else {
                val lockoutCount = (existingState?.lockoutCount ?: 0) + 1
                val backoffMultiplier = 1L shl (lockoutCount - 1).coerceAtMost(MAX_BACKOFF_EXPONENT)
                AttemptState(
                    failureCount = 0,
                    lockoutCount = lockoutCount,
                    lockedUntil = now.plus(baseDuration.multipliedBy(backoffMultiplier)),
                    lastFailureAt = now
                )
            }
        }
    }

    fun recordSuccess(key: String) {
        attemptStateByKey.remove(key)
    }

    fun trackedKeyCount(): Int = attemptStateByKey.size

    private fun purgeStaleStates(now: Instant) {

        val previousPurgeAt = lastPurgeAt.get()

        if (Duration.between(previousPurgeAt, now) < PURGE_INTERVAL || !lastPurgeAt.compareAndSet(previousPurgeAt, now)) {
            return
        }

        attemptStateByKey.entries.removeIf { (_, state) ->
            val unlocked = state.lockedUntil?.isBefore(now) ?: true
            unlocked && Duration.between(state.lastFailureAt, now) > retention
        }
    }

    private fun AttemptState?.freshFailureCount(now: Instant): Int {

        if (this == null) {
            return 0
        }

        val window = failureWindow ?: return failureCount

        return if (Duration.between(lastFailureAt, now) > window) 0 else failureCount
    }

    private data class AttemptState(
        val failureCount: Int,
        val lockoutCount: Int,
        val lockedUntil: Instant?,
        val lastFailureAt: Instant
    )

    companion object {
        private const val MAX_BACKOFF_EXPONENT = 5
        private val MINIMUM_RETENTION: Duration = Duration.ofHours(1)
        private val PURGE_INTERVAL: Duration = Duration.ofMinutes(1)
    }
}
