<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const props = defineProps<{
  modelValue: string   // 'YYYY-MM' or ''
  required?: boolean
  min?: string         // 'YYYY-MM' lower bound (inclusive)
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

type MonthYear = { month: number; year: number }

const pickerValue = computed<MonthYear | null>(() => {
  if (!props.modelValue) return null
  return {
    month: parseInt(props.modelValue.slice(5, 7)) - 1,
    year:  parseInt(props.modelValue.slice(0, 4)),
  }
})

const minDate = computed(() => {
  if (!props.min) return undefined
  return new Date(parseInt(props.min.slice(0, 4)), parseInt(props.min.slice(5, 7)) - 1, 1)
})

const startDate = computed(() =>
  !props.modelValue && minDate.value ? minDate.value : undefined
)

function onUpdate(val: MonthYear | null) {
  if (!val) { emit('update:modelValue', ''); return }
  const mm = String(val.month + 1).padStart(2, '0')
  emit('update:modelValue', `${val.year}-${mm}`)
}

function format(val: MonthYear) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[val.month]} ${val.year}`
}
</script>

<template>
  <div class="mp-wrap">
    <VueDatePicker
      :model-value="pickerValue"
      month-picker
      :min-date="minDate"
      :start-date="startDate"
      :disabled="disabled"
      :clearable="!required"
      :enable-time-picker="false"
      :format="format"
      auto-apply
      @update:model-value="onUpdate"
    />
  </div>
</template>

<style scoped>
.mp-wrap {
  --dp-font-size: 0.9rem;
  --dp-border-color: #ccc;
  --dp-border-radius: 4px;
  --dp-input-padding: 0.35rem 0.5rem;
  --dp-button-height: 30px;
  width: 100%;
}
</style>
