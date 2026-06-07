<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { money } from '../format'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer])

const props = defineProps<{
  title: string
  months: string[]                                  // x-axis, 'YYYY-MM'
  series: { name: string; data: (number | null)[] }[]
  warnings?: string[]                               // months where cash is negative
  zeroLine?: boolean                                // draw a y=0 reference
}>()

// Collapse the breach months into contiguous [start, end] spans for shading.
const warningRanges = computed(() => {
  const set = new Set(props.warnings ?? [])
  const ranges: { xAxis: string }[][] = []
  let runStart: string | null = null
  let prev: string | null = null
  for (const m of props.months) {
    if (set.has(m)) {
      if (runStart === null) runStart = m
      prev = m
    } else if (runStart !== null) {
      ranges.push([{ xAxis: runStart }, { xAxis: prev! }])
      runStart = null
    }
  }
  if (runStart !== null) ranges.push([{ xAxis: runStart }, { xAxis: prev! }])
  return ranges
})

const option = computed(() => ({
  title: { text: props.title, left: 0, textStyle: { fontSize: 14, fontWeight: 600 } },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v: number | null) => (v == null ? '—' : money(v)),
  },
  legend: { top: 0, right: 0 },
  grid: { left: 56, right: 16, top: 44, bottom: 56 },
  xAxis: {
    type: 'category',
    data: props.months,
    boundaryGap: false,
    axisLabel: { formatter: (v: string) => (v.endsWith('-01') ? v.slice(0, 4) : '') },
  },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: (v: number) => money(v) },
  },
  dataZoom: [
    { type: 'inside' },
    { type: 'slider', height: 18, bottom: 16 },
  ],
  series: props.series.map((s, i) => ({
    name: s.name,
    type: 'line',
    data: s.data,
    showSymbol: false,
    smooth: false,
    connectNulls: false,
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
    ...(i === 0 && warningRanges.value.length
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
