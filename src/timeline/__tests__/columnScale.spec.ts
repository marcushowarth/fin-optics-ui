import { describe, it, expect } from 'vitest'
import { buildColumns, columnStart, pxPerMonth } from '../columnScale'

describe('pxPerMonth', () => {
  it('divides the column width by months-per-column for each granularity', () => {
    expect(pxPerMonth('month')).toBe(34)
    expect(pxPerMonth('quarter')).toBe(64 / 3)
    expect(pxPerMonth('year')).toBe(8)
  })
})

describe('columnStart', () => {
  it('is the month itself at month granularity', () => {
    expect(columnStart('2026-05', 'month')).toBe('2026-05')
  })
  it('aligns to calendar quarters regardless of the input month', () => {
    expect(columnStart('2026-01', 'quarter')).toBe('2026-01')
    expect(columnStart('2026-02', 'quarter')).toBe('2026-01')
    expect(columnStart('2026-03', 'quarter')).toBe('2026-01')
    expect(columnStart('2026-04', 'quarter')).toBe('2026-04')
    expect(columnStart('2026-11', 'quarter')).toBe('2026-10')
  })
  it('aligns to calendar years', () => {
    expect(columnStart('2026-07', 'year')).toBe('2026-01')
  })
  it('aligns to the nearest multiple-of-5 year regardless of the input year', () => {
    expect(columnStart('2027-06', 'fiveYear')).toBe('2025-01')
    expect(columnStart('2025-01', 'fiveYear')).toBe('2025-01')
    expect(columnStart('2029-12', 'fiveYear')).toBe('2025-01')
    expect(columnStart('2030-01', 'fiveYear')).toBe('2030-01')
  })
  it('aligns to the nearest multiple-of-10 year regardless of the input year', () => {
    expect(columnStart('2033-04', 'decade')).toBe('2030-01')
    expect(columnStart('2030-01', 'decade')).toBe('2030-01')
    expect(columnStart('2039-12', 'decade')).toBe('2030-01')
    expect(columnStart('2040-01', 'decade')).toBe('2040-01')
  })
})

describe('columnLabel (via buildColumns)', () => {
  it('produces a compact range label for fiveYear columns', () => {
    const cols = buildColumns('2025-01', '2029-12', 'fiveYear')
    expect(cols).toHaveLength(1)
    expect(cols[0].label).toBe('2025–29')
  })
  it('produces a decade-style label for decade columns', () => {
    const cols = buildColumns('2030-01', '2039-12', 'decade')
    expect(cols).toHaveLength(1)
    expect(cols[0].label).toBe('2030s')
  })
})

describe('buildColumns', () => {
  it('produces one column per month at month granularity', () => {
    const cols = buildColumns('2026-01', '2026-06', 'month')
    expect(cols).toHaveLength(6)
    expect(cols.every(c => c.months === 1)).toBe(true)
    expect(cols.map(c => c.label)).toEqual(['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'])
  })

  it('produces calendar-aligned quarters spanning a full year', () => {
    const cols = buildColumns('2026-01', '2026-12', 'quarter')
    expect(cols).toHaveLength(4)
    expect(cols.map(c => c.label)).toEqual(['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'])
    expect(cols.every(c => c.months === 3)).toBe(true)
  })

  it('produces a partial first/last column when the window is not calendar-aligned', () => {
    // From = Feb (mid-Q1), to = Nov (mid-Q4): first/last quarter columns are partial.
    const cols = buildColumns('2026-02', '2026-11', 'quarter')
    expect(cols.map(c => c.label)).toEqual(['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'])
    expect(cols[0].months).toBe(2) // Feb, Mar only
    expect(cols[1].months).toBe(3)
    expect(cols[2].months).toBe(3)
    expect(cols[3].months).toBe(2) // Oct, Nov only
  })

  it('column widths (in months) always sum to the total month span', () => {
    for (const granularity of ['month', 'quarter', 'year', 'fiveYear', 'decade'] as const) {
      const cols = buildColumns('2026-01', '2055-12', granularity)
      const total = cols.reduce((sum, c) => sum + c.months, 0)
      expect(total).toBe(360)
    }
  })

  it('produces one column per year for a 30-year window', () => {
    const cols = buildColumns('2026-01', '2055-12', 'year')
    expect(cols).toHaveLength(30)
    expect(cols[0].label).toBe('2026')
    expect(cols[29].label).toBe('2055')
  })

  it('produces calendar-aligned fiveYear columns spanning a 30-year window', () => {
    const cols = buildColumns('2026-01', '2055-12', 'fiveYear')
    // 2026-01 is mid-block (2025-2029), so the first column is partial (2026-2029 = 4yr),
    // then 2030-2054 are five full 5-year blocks, then 2055 alone is a partial trailing column.
    expect(cols.map(c => c.label)).toEqual(['2025–29', '2030–34', '2035–39', '2040–44', '2045–49', '2050–54', '2055–59'])
    expect(cols[0].months).toBe(48) // 2026-2029
    expect(cols[1].months).toBe(60)
    expect(cols[cols.length - 1].months).toBe(12) // 2055 only
  })

  it('produces calendar-aligned decade columns spanning a 30-year window', () => {
    const cols = buildColumns('2026-01', '2055-12', 'decade')
    expect(cols.map(c => c.label)).toEqual(['2020s', '2030s', '2040s', '2050s'])
    expect(cols[0].months).toBe(48) // 2026-2029
    expect(cols[1].months).toBe(120)
    expect(cols[3].months).toBe(72) // 2050-2055
  })

  it('returns an empty array when to precedes from', () => {
    expect(buildColumns('2026-06', '2026-01', 'month')).toEqual([])
  })
})
