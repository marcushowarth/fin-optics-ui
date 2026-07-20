// Every field of a FinancialItem, as an ordered list of label/value pairs —
// backs the Grid's hover tooltip (#946 follow-up: the Grid is deliberately
// terse — see PlanGrid.vue's AMOUNT_FIELD comment — but Marcus wants the full
// picture available on hover without opening the edit modal).
//
// Formatting deliberately mirrors ItemForm.vue's amounts/timing steps so a
// figure reads identically in the modal and the tooltip:
//  - rates are stored as decimals (0.035) and rounded the same way as
//    ItemForm.vue's toPercent to avoid float noise (0.035 * 100 = 3.4999...)
//  - month strings ('YYYY-MM') use the timeline's shortMonthLabel
//  - currency uses format.ts's formatCurrency (exact, not the chart's
//    abbreviated money())
//
// Optional fields with a real "unset" state that still matters positionally
// (Asset saleDate, Income/Expenditure end) always get a row, falling back to
// "Ongoing" — matching how the Timeline draws them as open-ended bars.
// Fields that are just plain absent when unused (Investment drawdownStart /
// monthlyDrawdown, Description) are omitted entirely rather than shown blank.

import type { FinancialItem } from '../types'
import { shortMonthLabel } from '../timeline/dateMath'
import { formatCurrency } from '../format'

export interface DetailRow {
  label: string
  value: string
}

// Same technique as ItemForm.vue's toPercent: round to absorb float noise
// before appending the '%' suffix.
function pct(d: number): string {
  return `${Math.round(d * 1e6) / 1e4}%`
}

export function itemDetails(item: FinancialItem): DetailRow[] {
  const rows: DetailRow[] = []

  switch (item.type) {
    case 'asset':
      rows.push({ label: 'Start', value: shortMonthLabel(item.start) })
      rows.push({ label: 'Sale Date', value: item.saleDate ? shortMonthLabel(item.saleDate) : 'Ongoing' })
      rows.push({ label: 'Start Value', value: formatCurrency(item.startValue) })
      rows.push({ label: 'Annual Growth Rate', value: pct(item.annualGrowthRate) })
      break

    case 'investment':
      rows.push({ label: 'Start', value: shortMonthLabel(item.start) })
      rows.push({ label: 'Start Value', value: formatCurrency(item.startValue) })
      rows.push({ label: 'Annual Growth Rate', value: pct(item.annualGrowthRate) })
      if (item.drawdownStart) rows.push({ label: 'Drawdown Start', value: shortMonthLabel(item.drawdownStart) })
      if (item.monthlyDrawdown !== undefined) rows.push({ label: 'Monthly Drawdown', value: formatCurrency(item.monthlyDrawdown) })
      break

    case 'income':
    case 'expenditure':
      rows.push({ label: 'Start', value: shortMonthLabel(item.start) })
      rows.push({ label: 'End', value: item.end ? shortMonthLabel(item.end) : 'Ongoing' })
      rows.push({ label: 'Monthly Amount', value: formatCurrency(item.monthlyAmount) })
      rows.push({ label: 'Annual Growth Rate', value: pct(item.annualGrowthRate) })
      break

    case 'liability':
      rows.push({ label: 'Start', value: shortMonthLabel(item.start) })
      rows.push({ label: 'Balance', value: formatCurrency(item.balance) })
      rows.push({ label: 'Annual Interest Rate', value: pct(item.annualInterestRate) })
      rows.push({ label: 'Monthly Repayment', value: formatCurrency(item.monthlyRepayment) })
      break

    case 'event':
      rows.push({ label: 'Date', value: shortMonthLabel(item.date) })
      rows.push({ label: 'Direction', value: item.amount < 0 ? 'Out' : 'In' })
      rows.push({ label: 'Amount', value: formatCurrency(Math.abs(item.amount)) })
      break
  }

  if (item.description) rows.push({ label: 'Description', value: item.description })

  return rows
}
