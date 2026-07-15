export const CATEGORY_COLOR_VARS = [
  '--series-1',
  '--series-2',
  '--series-3',
  '--series-4',
  '--series-5',
  '--series-6',
  '--series-7',
  '--series-8',
  '--series-9',
] as const

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Assigns fixed categorical color slots in a stable order (highest total
// first). Every category gets its own entry — past this many, colors repeat
// rather than a category being dropped.
export function assignCategoryColors(categoriesByTotalDesc: string[]): Map<string, string> {
  const map = new Map<string, string>()
  categoriesByTotalDesc.forEach((cat, i) => {
    map.set(cat, CATEGORY_COLOR_VARS[i % CATEGORY_COLOR_VARS.length])
  })
  return map
}
