export function initials(name: string | undefined): string {
  const words = (name ?? '').split(/\s+/).filter((word) => word.length > 0)
  const first = words[0]
  const last = words[words.length - 1]
  if (!first || !last) {
    return '?'
  }
  const letters = words.length === 1 ? first.slice(0, 2) : `${first[0]}${last[0]}`
  return letters.toUpperCase()
}
