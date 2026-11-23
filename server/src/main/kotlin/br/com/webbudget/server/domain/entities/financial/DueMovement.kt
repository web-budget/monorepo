package br.com.webbudget.server.domain.entities.financial

import java.math.BigDecimal
import java.time.LocalDate

class DueMovement(
    val name: String,
    val type: Movement.Type,
    val value: BigDecimal,
    val dueDate: LocalDate,
    val financialPeriod: String
)
