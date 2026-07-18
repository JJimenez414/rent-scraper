import { useMemo, useState } from 'react'
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { ChartCategory, ChartRow } from '@/lib/trend'

const currency = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

type TooltipPayloadItem = {
  dataKey: string
  value: number
  color: string
}

function makeTooltip(categories: ChartCategory[]) {
  return function ChartTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: TooltipPayloadItem[]
    label?: string
  }) {
    if (!active || !payload?.length) return null
    // const sorted = [...payload].sort((a, b) => b.value - a.value)
    const sorted = [...payload].filter(c => c.value != 0)
    const total = sorted.reduce((sum, p) => sum + p.value, 0)

    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs min-w-[180px]">
        <div className="font-medium text-foreground mb-1.5">{label}</div>
        <div className="flex flex-col gap-1">
          {sorted.map((p) => {
            const cat = categories.find((c) => c.key === p.dataKey)
            return (
              <div key={p.dataKey} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="inline-block size-2 rounded-full" style={{ background: p.color }} />
                  {cat?.label.replace("_"," ") ?? p.dataKey}
                </span>
                <span className="font-medium tabular-nums text-foreground">{currency(p.value)}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-border flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums text-foreground">{currency(total)}</span>
        </div>
      </div>
    )
  }
}

export function ChargesTrendChart({
  data = [],
  categories = [],
  isLoading,
  error,
}: {
  data?: ChartRow[]
  categories?: ChartCategory[]
  isLoading?: boolean
  error?: string
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const visibleCategories = useMemo(
    () => categories.filter((c) => !hidden.has(c.key)),
    [categories, hidden],
  )

  const ChartTooltip = useMemo(() => makeTooltip(categories), [categories])

  function toggleCategory(key: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <Card className="viz-root">
      <style>{`
        .viz-root {
          --series-1: #2a78d6;
          --series-2: #1baf7a;
          --series-3: #eda100;
          --series-4: #008300;
          --series-5: #4a3aa7;
          --series-6: #e34948;
          --series-7: #e87ba4;
          --series-8: #eb6834;
          --series-9: #0e7c86;
        }
        @media (prefers-color-scheme: dark) {
          .viz-root {
            --series-1: #3987e5;
            --series-2: #199e70;
            --series-3: #c98500;
            --series-4: #008300;
            --series-5: #9085e9;
            --series-6: #e66767;
            --series-7: #d55181;
            --series-8: #d95926;
            --series-9: #2fa8b3;
          }
        }
      `}</style>
      <CardHeader>
        <CardTitle>Charges trend</CardTitle>
        <CardDescription>Monthly charge amounts by category, last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading trend…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-sm text-[#d03b3b]">{error}</div>
          ) : data.every((row) => Object.keys(row).length <= 1) ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No charge data yet. Run the scraper to populate the trend.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickFormatter={(v) => currency(v)}
                  width={64}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                  formatter={(_value, entry) => {
                    const key = (entry as { dataKey?: string }).dataKey
                    const cat = categories.find((c) => c.key === key)
                    const isHidden = key ? hidden.has(key) : false
                    return (
                      <span
                        className={isHidden ? 'text-muted-foreground/50' : 'text-foreground'}
                        style={{ cursor: 'pointer' }}
                      >
                        {cat?.label ?? key}
                      </span>
                    )
                  }}
                  onClick={(entry) => {
                    const key = (entry as { dataKey?: string }).dataKey
                    if (key) toggleCategory(key)
                  }}
                />
                {categories.map((cat) => (
                  <Line
                    key={cat.key}
                    dataKey={cat.key}
                    name={cat.label}
                    type="monotone"
                    stroke={`var(${cat.colorVar})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                    hide={hidden.has(cat.key)}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {data.length > 0 && categories.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Click a legend item to isolate or hide a charge category.{' '}
            {visibleCategories.length < categories.length &&
              `Showing ${visibleCategories.length} of ${categories.length} categories.`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
