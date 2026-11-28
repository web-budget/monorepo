export interface ComboboxOption {
  label: string
  value: string
}

export interface LabelPart {
  text: string
  parent: boolean
  matched: boolean
}

export interface MatchRange {
  start: number
  end: number
}

export interface OptionMatch {
  option: ComboboxOption
  range: MatchRange | null
}

const PARENT_SEPARATOR = ' > '
const COMBINING_MARKS = /[̀-ͯ]/g

function foldCharacter(character: string): string {
  return character.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
}

function fold(text: string): string {
  let folded = ''
  for (let index = 0; index < text.length; index++) {
    folded += foldCharacter(text.charAt(index))
  }
  return folded
}

function locate(label: string, position: number, length: number): MatchRange {
  let foldedLength = 0
  let start = 0
  let end = 0
  let startFound = false
  for (let index = 0; index < label.length; index++) {
    const nextLength = foldedLength + foldCharacter(label.charAt(index)).length
    if (!startFound && position < nextLength) {
      start = index
      startFound = true
    }
    const insideMatch = foldedLength < position + length
    const trailingMark = nextLength === foldedLength && end === index
    if (insideMatch || trailingMark) {
      end = index + 1
    }
    foldedLength = nextLength
  }
  return { start, end }
}

export function normalizeSearchText(text: string): string {
  return fold(text.trim())
}

export function findMatch(label: string, query: string): MatchRange | null {
  const needle = normalizeSearchText(query)
  if (needle === '') {
    return null
  }
  const position = fold(label).indexOf(needle)
  return position < 0 ? null : locate(label, position, needle.length)
}

export function filterOptions(options: ComboboxOption[], query: string): OptionMatch[] {
  if (normalizeSearchText(query) === '') {
    return options.map((option) => ({ option, range: null }))
  }
  return options.flatMap((option) => {
    const range = findMatch(option.label, query)
    return range ? [{ option, range }] : []
  })
}

export function splitLabel(label: string, range: MatchRange | null = null): LabelPart[] {
  const separatorAt = label.lastIndexOf(PARENT_SEPARATOR)
  const parentEnd = separatorAt >= 0 ? separatorAt + PARENT_SEPARATOR.length : 0
  const parts: LabelPart[] = []
  for (let index = 0; index < label.length; index++) {
    const parent = index < parentEnd
    const matched = range !== null && index >= range.start && index < range.end
    const last = parts[parts.length - 1]
    if (last && last.parent === parent && last.matched === matched) {
      last.text += label.charAt(index)
    } else {
      parts.push({ text: label.charAt(index), parent, matched })
    }
  }
  return parts
}
