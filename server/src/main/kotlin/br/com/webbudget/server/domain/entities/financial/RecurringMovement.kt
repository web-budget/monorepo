package br.com.webbudget.server.domain.entities.financial

import br.com.webbudget.server.domain.entities.PersistentEntity
import java.math.BigDecimal
import java.time.LocalDate

class RecurringMovement(
    var name: String,
    var value: BigDecimal,
    var startingAt: LocalDate,
    var classification: ClassificationReference,
    var costCenter: CostCenterReference,
    var state: State = State.ACTIVE,
    var autoLaunch: Boolean = true,
    var indeterminate: Boolean = false,
    var totalQuotes: Int? = null,
    var startingQuote: Int? = null,
    var currentQuote: Int? = null,
    var description: String? = null
) : PersistentEntity() {

    enum class State { ACTIVE, ENDED }
}
