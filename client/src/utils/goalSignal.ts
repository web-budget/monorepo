export type GoalKind = 'income' | 'expense'

export type GoalSignal = 'ok' | 'warn' | 'over'

const NEAR_THE_LIMIT = 0.9

/** The traffic light of a goal: the expense goal is a ceiling, the income goal is a floor. */
export function goalSignal(kind: GoalKind, realized: number, goal: number): GoalSignal {
  if (kind === 'income') {
    return realized >= goal ? 'ok' : 'warn'
  }
  if (realized > goal) {
    return 'over'
  }
  return realized >= goal * NEAR_THE_LIMIT ? 'warn' : 'ok'
}

/** How much of the goal was used, in percent. */
export function goalPercentage(realized: number, goal: number): number {
  return (realized / goal) * 100
}

/** The part of the bar that is filled, held between 0 and 100. */
export function meterWidth(realized: number, goal: number): number {
  return Math.min(100, Math.max(0, goalPercentage(realized, goal)))
}
