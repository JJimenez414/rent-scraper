import type { LedgerRow } from '@/lib/api'
import { assignCategoryColors, titleCase } from '@/lib/category-colors'

export type ChartCategory = { key: string; label: string; colorVar: string }
export type ChartRow = { month: string } & Record<string, number | string>
export type MonthEntries = { year: number; month: number; entries: LedgerRow[] }

const OTHER_KEY = '__other__'

export function recentMonths(count: number, from = new Date()): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = []
  let year = from.getFullYear()
  let month = from.getMonth() + 1

  for (let i = 0; i < count; i++) {
    result.push({ year, month })
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return result.reverse()
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function buildTrendFromMonths(
  months: MonthEntries[],
): { data: ChartRow[]; categories: ChartCategory[] } {
  const totalsByCategory = new Map<string, number>()
  for (const m of months) {
    for (const e of m.entries) {
      if (e.entry_type !== 'charge') continue
      totalsByCategory.set(e.category, (totalsByCategory.get(e.category) ?? 0) + Number(e.amount))
    }
  }

  const ordered = [...totalsByCategory.entries()].sort((a, b) => b[1] - a[1]).map(([cat]) => cat)
  const top = ordered.slice(0, 8)
  const hasOther = ordered.length > top.length
  const colorMap = assignCategoryColors(top)

  const data: ChartRow[] = months.map((m) => {
    const row: ChartRow = { month: monthLabel(m.year, m.month) }
    for (const cat of top) row[cat] = 0
    if (hasOther) row[OTHER_KEY] = 0

    for (const e of m.entries) {
      if (e.entry_type !== 'charge') continue
      const key = top.includes(e.category) ? e.category : OTHER_KEY
      row[key] = (Number(row[key]) || 0) + Number(e.amount)
    }
    return row
  })

  const categories: ChartCategory[] = top.map((cat) => ({
    key: cat,
    label: titleCase(cat),
    colorVar: colorMap.get(cat)!,
  }))
  if (hasOther) {
    categories.push({ key: OTHER_KEY, label: 'Other', colorVar: '--muted-foreground' })
  }

  return { data, categories }
}
