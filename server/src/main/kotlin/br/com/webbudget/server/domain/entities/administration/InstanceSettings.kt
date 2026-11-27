package br.com.webbudget.server.domain.entities.administration

class InstanceSettings(
    var reserveMonths: Int = DEFAULT_RESERVE_MONTHS
) {

    companion object {
        const val DEFAULT_RESERVE_MONTHS = 6
        const val MIN_RESERVE_MONTHS = 1
        const val MAX_RESERVE_MONTHS = 24
    }
}
