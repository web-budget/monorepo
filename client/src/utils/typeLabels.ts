export function typeKey(entity: string, type: string): string {
  return `${entity}.type.${type.toLowerCase().replace(/_/g, '-')}`
}

export function typeOptions(
  entity: string,
  types: readonly string[],
  translate: (key: string) => string,
) {
  return types.map((type) => ({ value: type, label: translate(typeKey(entity, type)) }))
}
