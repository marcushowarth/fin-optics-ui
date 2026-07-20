import { describe, it, expect } from 'vitest'
import { addMonths, clampYm, monthIndex, monthSpan, parseYm, pxDeltaToMonths, shortMonthLabel } from '../dateMath'

describe('parseYm', () => {
  it('splits a YYYY-MM string into year/month', () => {
    expect(parseYm('2026-01')).toEqual({ y: 2026, m: 1 })
    expect(parseYm('2055-12')).toEqual({ y: 2055, m: 12 })
  })
})

describe('monthIndex', () => {
  it('is 0 for the same month', () => {
    expect(monthIndex('2026-01', '2026-01')).toBe(0)
  })
  it('counts whole months forward within a year', () => {
    expect(monthIndex('2026-04', '2026-01')).toBe(3)
  })
  it('counts across year boundaries', () => {
    expect(monthIndex('2027-01', '2026-01')).toBe(12)
    expect(monthIndex('2028-06', '2026-01')).toBe(29)
  })
  it('is negative when ym is before from', () => {
    expect(monthIndex('2025-12', '2026-01')).toBe(-1)
  })
})

describe('addMonths', () => {
  it('adds within a year', () => {
    expect(addMonths('2026-01', 3)).toBe('2026-04')
  })
  it('rolls over a year boundary', () => {
    expect(addMonths('2026-10', 3)).toBe('2027-01')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
  })
  it('subtracts (negative delta), including rolling backward across a year', () => {
    expect(addMonths('2026-02', -1)).toBe('2026-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
  it('is the inverse of monthIndex', () => {
    expect(addMonths('2026-01', monthIndex('2031-07', '2026-01'))).toBe('2031-07')
  })
})

describe('monthSpan', () => {
  it('is 1 for a single month', () => {
    expect(monthSpan('2026-01', '2026-01')).toBe(1)
  })
  it('is 360 for a 30 year window (2026-01 to 2055-12)', () => {
    expect(monthSpan('2026-01', '2055-12')).toBe(360)
  })
})

describe('clampYm', () => {
  it('passes through values inside the range', () => {
    expect(clampYm('2030-06', '2026-01', '2055-12')).toBe('2030-06')
  })
  it('clamps below the minimum', () => {
    expect(clampYm('2020-01', '2026-01', '2055-12')).toBe('2026-01')
  })
  it('clamps above the maximum', () => {
    expect(clampYm('2060-01', '2026-01', '2055-12')).toBe('2055-12')
  })
})

describe('shortMonthLabel', () => {
  it('formats a month label', () => {
    expect(shortMonthLabel('2026-01')).toBe('Jan 2026')
    expect(shortMonthLabel('2026-12')).toBe('Dec 2026')
  })
})

describe('pxDeltaToMonths', () => {
  it('rounds a pixel delta to the nearest whole month', () => {
    expect(pxDeltaToMonths(0, 64)).toBe(0)
    expect(pxDeltaToMonths(64, 64)).toBe(1)
    expect(pxDeltaToMonths(30, 64)).toBe(0)
    expect(pxDeltaToMonths(40, 64)).toBe(1)
    expect(pxDeltaToMonths(-40, 64)).toBe(-1)
  })
  it('is 0 when pxPerMonth is not positive (defensive, avoids div/0)', () => {
    expect(pxDeltaToMonths(100, 0)).toBe(0)
  })

  describe('with a snapMonths argument', () => {
    it('defaults to 1 (unchanged month-level rounding) when omitted', () => {
      expect(pxDeltaToMonths(64, 64)).toBe(pxDeltaToMonths(64, 64, 1))
      expect(pxDeltaToMonths(40, 64)).toBe(pxDeltaToMonths(40, 64, 1))
    })
    it('rounds to the nearest whole year when snapMonths=12', () => {
      const pxPerMonth = 108 / 60 // fiveYear scale: 108px per 60-month column
      expect(pxDeltaToMonths(0, pxPerMonth, 12)).toBe(0)
      expect(pxDeltaToMonths(pxPerMonth * 12, pxPerMonth, 12)).toBe(12)
      expect(pxDeltaToMonths(pxPerMonth * 6, pxPerMonth, 12)).toBe(12) // rounds up to nearest year
      expect(pxDeltaToMonths(pxPerMonth * 5, pxPerMonth, 12)).toBe(0) // rounds down (less than half a year)
      expect(pxDeltaToMonths(-pxPerMonth * 12, pxPerMonth, 12)).toBe(-12)
    })
  })
})
