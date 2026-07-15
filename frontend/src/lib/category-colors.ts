export const CATEGORY_COLOR_VARS = [
  '--series-1',
  '--series-2',
  '--series-3',
  '--series-4',
  '--series-5',
  '--series-6',
  '--series-7',
  '--series-8',
] as const

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

// Assigns fixed categorical color slots in a stable order (highest total
// first). A 9th+ category never gets a generated hue — callers should fold
// it into an "Other" bucket instead.
export function assignCategoryColors(categoriesByTotalDesc: string[]): Map<string, string> {
  const map = new Map<string, string>()
  categoriesByTotalDesc.slice(0, CATEGORY_COLOR_VARS.length).forEach((cat, i) => {
    map.set(cat, CATEGORY_COLOR_VARS[i])
  })
  return map
}
