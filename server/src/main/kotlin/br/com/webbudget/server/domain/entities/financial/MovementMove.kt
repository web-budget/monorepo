package br.com.webbudget.server.domain.entities.financial

class MovementMove(
    val movement: Movement,
    val target: FinancialPeriodReference
)
