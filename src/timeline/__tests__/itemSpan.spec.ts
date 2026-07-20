import { describe, it, expect } from 'vitest'
import {
  computeItemSpan, hasDrawdownPhase, inferredEndMonth, isResizable, resizeItemEnd, shiftItemDates,
} from '../itemSpan'
import type {
  AssetItem, ExpenditureItem, FinancialEventItem, IncomeItem, InvestmentItem, LiabilityItem,
} from '../../types'

const FROM = '2026-01'
const TO = '2055-12'

describe('inferredEndMonth', () => {
  it('returns null when there is no projection result', () => {
    expect(inferredEndMonth('Mortgage', undefined)).toBeNull()
    expect(inferredEndMonth('Mortgage', null)).toBeNull()
  })
  it('returns null when the item has no series', () => {
    expect(inferredEndMonth('Mortgage', { Other: { '2026-01': 100 } })).toBeNull()
  })
  it('returns the last (chronologically latest) key of the series', () => {
    const positions = { Mortgage: { '2026-01': 900, '2026-03': 800, '2026-02': 850 } }
    expect(inferredEndMonth('Mortgage', positions)).toBe('2026-03')
  })
  it('works across a year boundary (string sort still matches chronological order)', () => {
    const positions = { Mortgage: { '2026-11': 100, '2027-01': 50, '2026-12': 75 } }
    expect(inferredEndMonth('Mortgage', positions)).toBe('2027-01')
  })
})

describe('computeItemSpan', () => {
  it('AssetItem: bar from start to saleDate when set', () => {
    const item: AssetItem = { type: 'asset', name: 'House', description: '', start: '2027-01', startValue: 300000, annualGrowthRate: 0.02, saleDate: '2035-06' }
    const span = computeItemSpan(item, FROM, TO, null)
    expect(span).toEqual({ kind: 'bar', start: '2027-01', end: '2035-06', openEnded: false, endInferred: false })
  })

  it('AssetItem: open-ended (clamped to `to`) when saleDate is unset', () => {
    const item: AssetItem = { type: 'asset', name: 'House', description: '', start: '2027-01', startValue: 300000, annualGrowthRate: 0.02 }
    const span = computeItemSpan(item, FROM, TO, null)
    expect(span).toMatchObject({ kind: 'bar', start: '2027-01', end: TO, openEnded: true })
  })

  it('IncomeItem: bar from start to end when set, else open-ended', () => {
    const withEnd: IncomeItem = { type: 'income', name: 'Salary', description: '', start: '2026-01', end: '2050-01', monthlyAmount: 4000, annualGrowthRate: 0.03 }
    expect(computeItemSpan(withEnd, FROM, TO, null)).toMatchObject({ start: '2026-01', end: '2050-01', openEnded: false })

    const noEnd: IncomeItem = { type: 'income', name: 'Salary', description: '', start: '2026-01', monthlyAmount: 4000, annualGrowthRate: 0.03 }
    expect(computeItemSpan(noEnd, FROM, TO, null)).toMatchObject({ end: TO, openEnded: true })
  })

  it('ExpenditureItem: same shape as Income', () => {
    const item: ExpenditureItem = { type: 'expenditure', name: 'Rent', description: '', start: '2026-01', end: '2030-01', monthlyAmount: 1500, annualGrowthRate: 0.02 }
    expect(computeItemSpan(item, FROM, TO, null)).toMatchObject({ start: '2026-01', end: '2030-01', openEnded: false })
  })

  it('FinancialEventItem: a point, not a bar', () => {
    const item: FinancialEventItem = { type: 'event', name: 'Wedding', description: '', date: '2028-06', amount: -20000 }
    const span = computeItemSpan(item, FROM, TO, null)
    expect(span).toEqual({ kind: 'point', start: '2028-06', end: '2028-06', openEnded: false, endInferred: false })
  })

  it('LiabilityItem: bar to the inferred payoff month when a projection result exists', () => {
    const item: LiabilityItem = { type: 'liability', name: 'Mortgage', description: '', start: '2026-01', balance: 200000, annualInterestRate: 0.04, monthlyRepayment: 1200 }
    const positions = { Mortgage: { '2026-01': 200000, '2044-07': 50, '2044-08': 0 } }
    const span = computeItemSpan(item, FROM, TO, positions)
    expect(span).toMatchObject({ kind: 'bar', start: '2026-01', end: '2044-08', endInferred: true, openEnded: false })
  })

  it('LiabilityItem: open-ended (to `to`) when there is no projection result yet', () => {
    const item: LiabilityItem = { type: 'liability', name: 'Mortgage', description: '', start: '2026-01', balance: 200000, annualInterestRate: 0.04, monthlyRepayment: 1200 }
    const span = computeItemSpan(item, FROM, TO, null)
    expect(span).toMatchObject({ end: TO, openEnded: true, endInferred: false })
  })

  it('InvestmentItem: uses the same inferred-end technique as Liability', () => {
    const item: InvestmentItem = { type: 'investment', name: 'ISA', description: '', start: '2026-01', startValue: 50000, annualGrowthRate: 0.05, drawdownStart: '2045-01', monthlyDrawdown: 2000 }
    const positions = { ISA: { '2026-01': 50000, '2050-11': 100, '2050-12': 0 } }
    const span = computeItemSpan(item, FROM, TO, positions)
    expect(span).toMatchObject({ end: '2050-12', endInferred: true })
  })

  it('clamps start/end into the visible [from, to] window', () => {
    const item: AssetItem = { type: 'asset', name: 'Old House', description: '', start: '2010-01', startValue: 100000, annualGrowthRate: 0.02, saleDate: '2060-01' }
    const span = computeItemSpan(item, FROM, TO, null)
    expect(span).toMatchObject({ start: FROM, end: TO })
  })
})

describe('shiftItemDates', () => {
  it('is a no-op for a zero delta', () => {
    const item: IncomeItem = { type: 'income', name: 'Salary', description: '', start: '2026-01', monthlyAmount: 4000, annualGrowthRate: 0.03 }
    expect(shiftItemDates(item, 0)).toBe(item)
  })

  it('shifts start and preserves duration by shifting end too', () => {
    const item: ExpenditureItem = { type: 'expenditure', name: 'Rent', description: '', start: '2026-01', end: '2030-01', monthlyAmount: 1500, annualGrowthRate: 0.02 }
    const shifted = shiftItemDates(item, 6) as ExpenditureItem
    expect(shifted.start).toBe('2026-07')
    expect(shifted.end).toBe('2030-07')
  })

  it('leaves an unset end unset when shifting an open-ended item', () => {
    const item: AssetItem = { type: 'asset', name: 'House', description: '', start: '2026-01', startValue: 300000, annualGrowthRate: 0.02 }
    const shifted = shiftItemDates(item, 3) as AssetItem
    expect(shifted.start).toBe('2026-04')
    expect(shifted.saleDate).toBeUndefined()
  })

  it('shifts an Investment drawdownStart along with start', () => {
    const item: InvestmentItem = { type: 'investment', name: 'ISA', description: '', start: '2026-01', startValue: 50000, annualGrowthRate: 0.05, drawdownStart: '2045-01' }
    const shifted = shiftItemDates(item, 12) as InvestmentItem
    expect(shifted.start).toBe('2027-01')
    expect(shifted.drawdownStart).toBe('2046-01')
  })

  it('shifts a Liability start only (no stored end field to move)', () => {
    const item: LiabilityItem = { type: 'liability', name: 'Mortgage', description: '', start: '2026-01', balance: 200000, annualInterestRate: 0.04, monthlyRepayment: 1200 }
    const shifted = shiftItemDates(item, 2) as LiabilityItem
    expect(shifted.start).toBe('2026-03')
  })

  // A FinancialEventItem is a point marker in the timeline, not a bar — but it
  // should still be draggable to a new date, same as a bar's whole-item move.
  it("shifts a FinancialEventItem's date (dragging a one-off point marker)", () => {
    const item: FinancialEventItem = { type: 'event', name: 'Wedding', description: '', date: '2028-06', amount: -20000 }
    const shifted = shiftItemDates(item, 4) as FinancialEventItem
    expect(shifted.date).toBe('2028-10')
  })
})

describe('resizeItemEnd', () => {
  it('sets saleDate for an Asset', () => {
    const item: AssetItem = { type: 'asset', name: 'House', description: '', start: '2026-01', startValue: 300000, annualGrowthRate: 0.02 }
    expect((resizeItemEnd(item, '2040-01') as AssetItem).saleDate).toBe('2040-01')
  })
  it('sets end for Income/Expenditure', () => {
    const income: IncomeItem = { type: 'income', name: 'Salary', description: '', start: '2026-01', monthlyAmount: 4000, annualGrowthRate: 0.03 }
    expect((resizeItemEnd(income, '2045-01') as IncomeItem).end).toBe('2045-01')
  })
  it('is a no-op for Liability/Investment (no editable end field)', () => {
    const liability: LiabilityItem = { type: 'liability', name: 'Mortgage', description: '', start: '2026-01', balance: 200000, annualInterestRate: 0.04, monthlyRepayment: 1200 }
    expect(resizeItemEnd(liability, '2040-01')).toBe(liability)
  })
})

describe('isResizable', () => {
  it('is true only for Asset/Income/Expenditure', () => {
    const asset: AssetItem = { type: 'asset', name: 'House', description: '', start: '2026-01', startValue: 1, annualGrowthRate: 0 }
    const liability: LiabilityItem = { type: 'liability', name: 'Mortgage', description: '', start: '2026-01', balance: 1, annualInterestRate: 0, monthlyRepayment: 0 }
    const investment: InvestmentItem = { type: 'investment', name: 'ISA', description: '', start: '2026-01', startValue: 1, annualGrowthRate: 0 }
    expect(isResizable(asset)).toBe(true)
    expect(isResizable(liability)).toBe(false)
    expect(isResizable(investment)).toBe(false)
  })
})

describe('hasDrawdownPhase', () => {
  it('is true only when an Investment has a drawdownStart set', () => {
    const withDrawdown: InvestmentItem = { type: 'investment', name: 'ISA', description: '', start: '2026-01', startValue: 1, annualGrowthRate: 0, drawdownStart: '2045-01' }
    const withoutDrawdown: InvestmentItem = { type: 'investment', name: 'ISA', description: '', start: '2026-01', startValue: 1, annualGrowthRate: 0 }
    expect(hasDrawdownPhase(withDrawdown)).toBe(true)
    expect(hasDrawdownPhase(withoutDrawdown)).toBe(false)
  })
})
