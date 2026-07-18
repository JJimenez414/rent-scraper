import { useCallback, useEffect, useState } from 'react'
import { Loader2, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChargesTrendChart } from '@/components/dashboard/charges-trend-chart'
import { RecentChargesTable } from '@/components/dashboard/recent-charges-table'
import { getMonthCharges, triggerScrape, type LedgerRow } from '@/lib/api'
import { buildTrendFromMonths, recentMonths, type ChartCategory, type ChartRow } from '@/lib/trend'

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

function App() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(CURRENT_YEAR)

  const [entries, setEntries] = useState<LedgerRow[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [entriesError, setEntriesError] = useState<string>()

  const [isTriggering, setIsTriggering] = useState(false)
  const [triggerMessage, setTriggerMessage] = useState<{ kind: 'success' | 'error'; text: string }>()
  const [triggerTimestamp, setTriggerTimestamp] = useState("")
  
  const [trendData, setTrendData] = useState<ChartRow[]>([])
  const [trendCategories, setTrendCategories] = useState<ChartCategory[]>([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState<string>()

  const loadEntries = useCallback(async (y: number, m: number) => {
    setEntriesLoading(true)
    setEntriesError(undefined)
    try {
      const { entries } = await getMonthCharges(y, m)
      setEntries(entries)
    } catch (err) {
      setEntriesError(err instanceof Error ? err.message : 'Failed to load charges.')
    } finally {
      setEntriesLoading(false)
    }
  }, [])

  const loadTrend = useCallback(async () => {
    setTrendLoading(true)
    setTrendError(undefined)
    try {
      const months = recentMonths(12)
      // Fetched sequentially (not Promise.all) so we don't outrun the
      // backend's connection pool (maxconn=10) with 12 concurrent requests.
      const results = []
      for (const { year, month } of months) {
        const { entries } = await getMonthCharges(year, month)
        results.push({ year, month, entries })
      }
      const { data, categories } = buildTrendFromMonths(results)
      setTrendData(data)
      setTrendCategories(categories)
    } catch (err) {
      setTrendError(err instanceof Error ? err.message : 'Failed to load trend.')
    } finally {
      setTrendLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries(year, month)
  }, [loadEntries, year, month])

  useEffect(() => {
    loadTrend()
  }, [loadTrend])

  async function handleTrigger() {
    setIsTriggering(true)
    setTriggerMessage(undefined)
    setTriggerTimestamp("")
    var formattedTimestamp = ""
    try {
      const res = await triggerScrape()
      setTriggerMessage({ kind: 'success', text: res.status })
      formattedTimestamp = formatLastRun(res.timestamp)
      console.log(res.timestamp)
      await Promise.all([loadEntries(year, month), loadTrend()])
    } catch (err) {
      setTriggerMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Scrape failed.',
      })
    } finally {
      setTriggerTimestamp(formattedTimestamp)
      setIsTriggering(false)
    }
  }

  function formatLastRun(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-lg font-semibold text-foreground">AMLI Lakeline · Rent Dashboard</h1>
            <p className="text-sm text-muted-foreground">Charges tracked from the resident portal ledger</p>
          </div>
          <div className="flex flex-row items-center gap-3">
            <div className='flex flex-col items-end gap-1'>
              <span className='text-xs text-[#006300]'>
                {triggerTimestamp}
              </span>

              {triggerMessage && (
                <span
                  className={
                    triggerMessage.kind === 'success'
                      ? 'text-xs text-[#006300] dark:text-[#0ca30c]'
                      : 'text-xs text-[#d03b3b]'
                  }
                >
                  {triggerMessage.text}
                </span>
              )}
            </div>
            <Button
              onClick={handleTrigger}
              disabled={isTriggering}
              size="lg"
              className="gap-2 px-4 shadow-sm"
            >
              {isTriggering ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PlayCircle className="size-4" />
              )}
              {isTriggering ? 'Running scraper…' : 'Run scraper'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <ChargesTrendChart data={trendData} categories={trendCategories} isLoading={trendLoading} error={trendError} />

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-foreground">Viewing charges for</span>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <RecentChargesTable entries={entries} isLoading={entriesLoading} error={entriesError} />
      </main>
    </div>
  )
}

export default App
