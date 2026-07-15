<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, VisualMapPiecewiseComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { money, ageAtTimestamp } from '../format'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, VisualMapPiecewiseComponent, CanvasRenderer])

const props = defineProps<{
  months: string[]                                  // 'YYYY-MM'
  series: { name: string; data: (number | null)[] }[]
  warnings?: string[]                               // months where cash is negative
  zeroLine?: boolean                                // draw a y=0 reference
  primaryOnly?: boolean                             // start with only the first series visible
  stacked?: boolean                                 // stacked area breakdown mode
  liquidityColors?: boolean                         // colour the primary line/area by sign (green above zero, red below)
  ageFrom?: string | null                            // 'YYYY-MM' date of birth — show age instead of calendar date when set
}>()

// Reuses the app's existing brand colours (App.vue run-btn green, warning-banner
// red) rather than introducing a new hue — this is a status encoding (healthy vs
// critical liquidity), not a new series identity.
const LIQUIDITY_GOOD = '#1a5c3a'
const LIQUIDITY_CRITICAL = '#c0392b'

// Show just the first series (Nominal) on load; the rest are opt-in via the legend.
const legendSelected = computed(() =>
  props.primaryOnly
    ? Object.fromEntries(props.series.map((s, i) => [s.name, i === 0]))
    : undefined,
)

// 'YYYY-MM' → UTC timestamp at the first of that month (avoids TZ drift).
function ts(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return Date.UTC(y, m - 1, 1)
}

function nextMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return m === 12 ? Date.UTC(y + 1, 0, 1) : Date.UTC(y, m, 1)
}

const monthLabel = computed(() => new Map(props.months.map(m => [ts(m), m])))

// Each series as [timestamp, value] pairs so the x-axis can be a real time axis.
const timeSeries = computed(() =>
  props.series.map(s => ({
    name: s.name,
    data: props.months.map((m, i) => [ts(m), s.data[i]] as [number, number | null]),
  })),
)

// Contiguous breach runs as [start, endExclusive] timestamp spans, so even a
// single-month breach renders a band with width.
const warningRanges = computed(() => {
  const set = new Set(props.warnings ?? [])
  const ranges: { xAxis: number }[][] = []
  let runStart: string | null = null
  let prev: string | null = null
  for (const m of props.months) {
    if (set.has(m)) {
      if (runStart === null) runStart = m
      prev = m
    } else if (runStart !== null) {
      ranges.push([{ xAxis: ts(runStart) }, { xAxis: nextMonth(prev!) }])
      runStart = null
    }
  }
  if (runStart !== null) ranges.push([{ xAxis: ts(runStart) }, { xAxis: nextMonth(prev!) }])
  return ranges
})

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      label: {
        formatter: (p: { value: number }) =>
          props.ageFrom
            ? `Age ${ageAtTimestamp(p.value, props.ageFrom)}`
            : (monthLabel.value.get(p.value) ?? ''),
      },
    },
    valueFormatter: (v: number | null) => (v == null ? '—' : money(v)),
  },
  legend: { top: 0, right: 0, selected: legendSelected.value },
  grid: { left: 64, right: 16, top: 32, bottom: 56 },
  xAxis: {
    type: 'time',
    axisLabel: props.ageFrom
      ? { formatter: (v: number) => String(ageAtTimestamp(v, props.ageFrom!)) }
      : { formatter: { year: '{yyyy}', month: '{MMM}' } },
    minInterval: 3600 * 1000 * 24 * 28,
  },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: (v: number) => money(v) },
  },
  dataZoom: [
    { type: 'inside' },
    { type: 'slider', height: 18, bottom: 16 },
  ],
  // Colours the primary line + area by sign — a status encoding (healthy vs
  // critical liquidity), not a series identity, so it targets seriesIndex 0
  // only and stays hidden as a legend/filter widget.
  ...(props.liquidityColors
    ? {
        visualMap: {
          show: false,
          seriesIndex: 0,
          dimension: 1,
          // Explicit finite bounds on both pieces — an open-ended min/max piece
          // crashes echarts' internal gradient-stop calculation for line series
          // (getVisualGradient reading 'coord' of undefined).
          pieces: [
            { gte: 0, lte: 1e15, color: LIQUIDITY_GOOD },
            { gte: -1e15, lt: 0, color: LIQUIDITY_CRITICAL },
          ],
        },
      }
    : {}),
  series: timeSeries.value.map((s, i) => ({
    name: s.name,
    type: 'line',
    data: s.data,
    showSymbol: false,
    smooth: false,
    connectNulls: false,
    ...(props.stacked ? { stack: 'total', areaStyle: { opacity: 0.55 } } : {}),
    ...(i === 0 && props.liquidityColors ? { areaStyle: { opacity: 0.18 } } : {}),
    // Warning bands + zero line ride on the first series so they render once.
    ...(i === 0 && props.zeroLine
      ? {
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#c0392b', type: 'dashed' },
            data: [{ yAxis: 0 }],
            label: { show: false },
          },
        }
      : {}),
    // The banded warning overlay is redundant once the area itself is
    // coloured by sign — it traced the same "which months are negative"
    // story more coarsely.
    ...(i === 0 && warningRanges.value.length && !props.liquidityColors
      ? {
          markArea: {
            silent: true,
            itemStyle: { color: 'rgba(192, 57, 43, 0.10)' },
            data: warningRanges.value,
          },
        }
      : {}),
  })),
}))
</script>

<template>
  <VChart class="chart" :option="option" autoresize />
</template>

<style scoped>
.chart {
  height: 320px;
  width: 100%;
}
</style>
