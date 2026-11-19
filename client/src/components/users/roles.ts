export const ROLE_ORDER = ['DASHBOARDS', 'FINANCIAL', 'REGISTRATION', 'ADMINISTRATION']

function rank(role: string): number {
  const position = ROLE_ORDER.indexOf(role)
  return position === -1 ? ROLE_ORDER.length : position
}

export function sortRoles(roles: string[]): string[] {
  return [...roles].sort((first, second) => rank(first) - rank(second))
}
