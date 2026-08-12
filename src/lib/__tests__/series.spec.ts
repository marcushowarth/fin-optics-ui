import { describe, it, expect } from 'vitest'
import { buildSeries } from '../series'

describe('buildSeries', () => {
  it('builds a Nominal series from the given months', () => {
    const months = ['2026-01', '2026-02', '2026-03']
    const nominal = { '2026-01': 100, '2026-02': 150 }
    expect(buildSeries(months, nominal, undefined)).toEqual([
      { name: 'Nominal', data: [100, 150, null] },
    ])
  })

  it('adds one Real series per inflation scenario when present', () => {
    const months = ['2026-01', '2026-02']
    const nominal = { '2026-01': 100, '2026-02': 150 }
    const real = {
      low: { '2026-01': 95, '2026-02': 140 },
      high: { '2026-01': 90 },
    }
    expect(buildSeries(months, nominal, real)).toEqual([
      { name: 'Nominal', data: [100, 150] },
      { name: 'Real · low', data: [95, 140] },
      { name: 'Real · high', data: [90, null] },
    ])
  })

  it('returns just Nominal when real is undefined', () => {
    expect(buildSeries(['2026-01'], { '2026-01': 5 }, undefined)).toEqual([
      { name: 'Nominal', data: [5] },
    ])
  })
})
