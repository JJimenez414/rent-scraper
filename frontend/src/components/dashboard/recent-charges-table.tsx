import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { LedgerRow } from '@/lib/api'

const currency = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const typeStyles: Record<LedgerRow['entry_type'], string> = {
  charge: 'bg-input/20 text-foreground border-transparent',
  payment: 'bg-[#0ca30c]/10 text-[#006300] dark:text-[#0ca30c] border-transparent',
}

export function RecentChargesTable({
  entries,
  isLoading,
  error,
}: {
  entries: LedgerRow[]
  isLoading?: boolean
  error?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Charges</CardTitle>
        <CardDescription>Ledger entries for the selected month</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-[#d03b3b]">{error}</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No ledger entries for this month yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDate(entry.entry_date)}
                  </TableCell>
                  <TableCell>{titleCase(entry.category)}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.payer}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {currency(entry.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={typeStyles[entry.entry_type]}>
                      {entry.entry_type}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
