import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  icon,
}: {
  label: string
  value: string
  delta?: number
  deltaLabel?: string
  icon?: ReactNode
}) {
  const isGood = delta !== undefined && delta <= 0
  const hasDelta = delta !== undefined

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
          {hasDelta && (
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                isGood ? 'text-[#006300] dark:text-[#0ca30c]' : 'text-[#d03b3b]',
              )}
            >
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)}% {deltaLabel}
            </span>
          )}
        </div>
        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
