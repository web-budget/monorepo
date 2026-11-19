package br.com.webbudget.server.utilities

import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

class MutableClock(private var current: Instant = Instant.parse("2026-01-01T00:00:00Z")) : Clock() {

    fun advance(duration: Duration) {
        current = current.plus(duration)
    }

    override fun getZone(): ZoneId = ZoneOffset.UTC

    override fun withZone(zone: ZoneId): Clock = this

    override fun instant(): Instant = current
}
