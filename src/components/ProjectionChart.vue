<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer])

const props = defineProps<{
  title: string
  months: string[]                                  // x-axis, 'YYYY-MM'
  series: { name: string; data: (number | null)[] }[]
}>()

function money(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(2)}m`
  if (abs >= 1_000)     return `${sign}£${(abs / 1_000).toFixed(0)}k`
  return `${sign}£${abs.toFixed(0)}`
}

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
  series: props.series.map(s => ({
    name: s.name,
    type: 'line',
    data: s.data,
    showSymbol: false,
    smooth: false,
    connectNulls: false,
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
