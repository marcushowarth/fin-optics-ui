<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProjectionStore } from '../stores/projection'
import MonthPicker from './MonthPicker.vue'
import type {
  ItemType, AssetItem, InvestmentItem, BankAccountItem,
  IncomeItem, ExpenditureItem, LiabilityItem, FinancialEventItem, FinancialItem,
} from '../types'

const store = useProjectionStore()

const today = new Date()
const todayYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

const type = ref<ItemType>('income')
const name = ref('')
const description = ref('')

// Shared date fields
const start = ref(todayYM)
const end = ref('')

// Asset / Investment
const startValue = ref<number | ''>('')
const annualGrowthRate = ref<number | ''>('')
const saleDate = ref('')

// Investment drawdown
const drawdownStart = ref('')
const monthlyDrawdown = ref<number | ''>('')

// Bank account
const startBalance = ref<number | ''>('')

// Income / Expenditure
const monthlyAmount = ref<number | ''>('')

// Liability
const balance = ref<number | ''>('')
const annualInterestRate = ref<number | ''>('')
const monthlyRepayment = ref<number | ''>('')

// One-off event (reuses `start` as the event date)
const direction = ref<'in' | 'out'>('out')
const eventAmount = ref<number | ''>('')

const TYPES: { value: ItemType; label: string }[] = [
  { value: 'asset',        label: 'Asset' },
  { value: 'investment',   label: 'Investment' },
  { value: 'bank-account', label: 'Bank Account' },
  { value: 'income',       label: 'Income' },
  { value: 'expenditure',  label: 'Expenditure' },
  { value: 'liability',    label: 'Liability' },
  { value: 'event',        label: 'One-off' },
]

const NAME_PLACEHOLDERS: Record<ItemType, string> = {
  'asset':        'e.g. Property',
  'investment':   'e.g. Stocks & Shares ISA',
  'bank-account': 'e.g. Monzo',
  'income':       'e.g. Main salary',
  'expenditure':  'e.g. Rent',
  'liability':    'e.g. Mortgage',
  'event':        'e.g. Wedding, Inheritance',
}

// --- Wizard -----------------------------------------------------------------
// Grouped steps: basics → timing → amounts. Bank Account has no timing fields,
// so it skips that step. Because timing is entered before amounts, every date
// field can default forward off `start` (see MonthPicker :min) — no disabled
// guards needed; the engine validates the rest by running the projection.

const step = ref(0)

const steps = computed<string[]>(() =>
  type.value === 'bank-account' ? ['basics', 'amounts'] : ['basics', 'timing', 'amounts'],
)

const currentStep = computed(() => steps.value[step.value])
const isLast = computed(() => step.value === steps.value.length - 1)
const isEditing = computed(() => store.editingIndex !== null)

// Only basics needs a guard (a name); timing/amounts advance freely.
const canAdvance = computed(() =>
  currentStep.value === 'basics' ? !!name.value.trim() : true,
)

watch(type, () => { step.value = 0 })

function next() {
  if (canAdvance.value && step.value < steps.value.length - 1) step.value++
}

function back() {
  if (step.value > 0) step.value--
}

const STEP_TITLES: Record<string, string> = {
  basics:  'Type & name',
  timing:  'Timing',
  amounts: 'Amounts',
}

const isValid = computed(() => {
  if (!name.value.trim()) return false
  switch (type.value) {
    case 'asset':
      return !!start.value && startValue.value !== '' && annualGrowthRate.value !== ''
    case 'investment':
      return !!start.value && startValue.value !== '' && annualGrowthRate.value !== ''
    case 'bank-account':
      return startBalance.value !== ''
    case 'income':
      return !!start.value && monthlyAmount.value !== '' && annualGrowthRate.value !== ''
    case 'expenditure':
      return !!start.value && monthlyAmount.value !== ''
    case 'liability':
      return !!start.value && balance.value !== '' && annualInterestRate.value !== '' && monthlyRepayment.value !== ''
    case 'event':
      return !!start.value && eventAmount.value !== ''
  }
})

function reset() {
  name.value = ''
  description.value = ''
  start.value = todayYM
  end.value = ''
  startValue.value = ''
  annualGrowthRate.value = ''
  saleDate.value = ''
  drawdownStart.value = ''
  monthlyDrawdown.value = ''
  startBalance.value = ''
  monthlyAmount.value = ''
  balance.value = ''
  annualInterestRate.value = ''
  monthlyRepayment.value = ''
  direction.value = 'out'
  eventAmount.value = ''
  step.value = 0
}

// Stored rates are decimals (0.03); the form shows them as percentages (3).
// Round to absorb float noise, e.g. 0.035 * 100 = 3.4999999999999996.
const toPercent = (d: number) => Math.round(d * 1e6) / 1e4

// Repopulate the form from an existing item, then walk it through the carousel
// again from step 1. Optional fields fall back to the empty/unset state.
function load(item: FinancialItem) {
  reset()
  type.value = item.type
  name.value = item.name
  description.value = item.description
  switch (item.type) {
    case 'asset':
      start.value = item.start
      startValue.value = item.startValue
      annualGrowthRate.value = toPercent(item.annualGrowthRate)
      saleDate.value = item.saleDate ?? ''
      break
    case 'investment':
      start.value = item.start
      startValue.value = item.startValue
      annualGrowthRate.value = toPercent(item.annualGrowthRate)
      drawdownStart.value = item.drawdownStart ?? ''
      monthlyDrawdown.value = item.monthlyDrawdown ?? ''
      break
    case 'bank-account':
      startBalance.value = item.startBalance
      break
    case 'income':
      start.value = item.start
      end.value = item.end ?? ''
      monthlyAmount.value = item.monthlyAmount
      annualGrowthRate.value = toPercent(item.annualGrowthRate)
      break
    case 'expenditure':
      start.value = item.start
      end.value = item.end ?? ''
      monthlyAmount.value = item.monthlyAmount
      break
    case 'liability':
      start.value = item.start
      balance.value = item.balance
      annualInterestRate.value = toPercent(item.annualInterestRate)
      monthlyRepayment.value = item.monthlyRepayment
      break
    case 'event':
      start.value = item.date
      direction.value = item.amount < 0 ? 'out' : 'in'
      eventAmount.value = Math.abs(item.amount)
      break
  }
  step.value = 0
}

watch(() => store.editingIndex, (idx) => {
  if (idx !== null) load(store.items[idx])
})

function cancel() {
  store.cancelEdit()
  reset()
}

function submit() {
  if (!isValid.value) return
  let item: FinancialItem

  const base = { name: name.value.trim(), description: description.value.trim() }

  switch (type.value) {
    case 'asset': {
      const a: AssetItem = { ...base, type: 'asset', start: start.value, startValue: +startValue.value, annualGrowthRate: +annualGrowthRate.value / 100 }
      if (saleDate.value) a.saleDate = saleDate.value
      item = a
      break
    }
    case 'investment': {
      const inv: InvestmentItem = { ...base, type: 'investment', start: start.value, startValue: +startValue.value, annualGrowthRate: +annualGrowthRate.value / 100 }
      if (drawdownStart.value) inv.drawdownStart = drawdownStart.value
      if (monthlyDrawdown.value !== '') inv.monthlyDrawdown = +monthlyDrawdown.value
      item = inv
      break
    }
    case 'bank-account':
      item = { ...base, type: 'bank-account', startBalance: +startBalance.value } as BankAccountItem
      break
    case 'income': {
      const inc: IncomeItem = { ...base, type: 'income', start: start.value, monthlyAmount: +monthlyAmount.value, annualGrowthRate: +annualGrowthRate.value / 100 }
      if (end.value) inc.end = end.value
      item = inc
      break
    }
    case 'expenditure': {
      const exp: ExpenditureItem = { ...base, type: 'expenditure', start: start.value, monthlyAmount: +monthlyAmount.value }
      if (end.value) exp.end = end.value
      item = exp
      break
    }
    case 'liability':
      item = { ...base, type: 'liability', start: start.value, balance: +balance.value, annualInterestRate: +annualInterestRate.value / 100, monthlyRepayment: +monthlyRepayment.value } as LiabilityItem
      break
    case 'event': {
      const magnitude = +eventAmount.value
      const ev: FinancialEventItem = { ...base, type: 'event', date: start.value, amount: direction.value === 'out' ? -magnitude : magnitude }
      item = ev
      break
    }
  }

  if (store.editingIndex !== null) {
    store.updateItem(store.editingIndex, item)
    store.cancelEdit()
  } else {
    store.addItem(item)
  }
  reset()
}
</script>

<template>
  <form class="item-form" @submit.prevent="submit">
    <header class="wizard-head">
      <h2>{{ isEditing ? 'Edit Item' : 'Add Item' }}</h2>
      <span class="progress">Step {{ step + 1 }}/{{ steps.length }} · {{ STEP_TITLES[currentStep] }}</span>
    </header>

    <!-- Step: basics -->
    <div v-if="currentStep === 'basics'" class="step">
      <div class="row">
        <label>Type</label>
        <select v-model="type">
          <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>
      <div class="row">
        <label>Name</label>
        <input v-model="name" type="text" :placeholder="NAME_PLACEHOLDERS[type]" @keydown.enter.prevent="next" />
      </div>
      <div class="row">
        <label>Description</label>
        <input v-model="description" type="text" placeholder="Optional" />
      </div>
    </div>

    <!-- Step: timing -->
    <div v-else-if="currentStep === 'timing'" class="step">
      <template v-if="type === 'asset'">
        <div class="row"><label>Start</label><MonthPicker v-model="start" :required="true" /></div>
        <div class="row"><label>Sale Date</label><MonthPicker v-model="saleDate" :min="start" /></div>
      </template>
      <template v-else-if="type === 'investment'">
        <div class="row"><label>Start</label><MonthPicker v-model="start" :required="true" /></div>
        <div class="row"><label>Drawdown Start</label><MonthPicker v-model="drawdownStart" :min="start" /></div>
      </template>
      <template v-else-if="type === 'income' || type === 'expenditure'">
        <div class="row"><label>Start</label><MonthPicker v-model="start" :required="true" /></div>
        <div class="row"><label>End</label><MonthPicker v-model="end" :min="start" /></div>
      </template>
      <template v-else-if="type === 'liability'">
        <div class="row"><label>Start</label><MonthPicker v-model="start" :required="true" /></div>
      </template>
      <template v-else-if="type === 'event'">
        <div class="row"><label>Date</label><MonthPicker v-model="start" :required="true" /></div>
      </template>
    </div>

    <!-- Step: amounts -->
    <div v-else class="step">
      <template v-if="type === 'asset'">
        <div class="row"><label>Start Value (£)</label><input v-model.number="startValue" type="number" min="0" step="0.01" /></div>
        <div class="row"><label>Annual Growth Rate (%)</label><input v-model.number="annualGrowthRate" type="number" step="0.1" /></div>
      </template>
      <template v-else-if="type === 'investment'">
        <div class="row"><label>Start Value (£)</label><input v-model.number="startValue" type="number" min="0" step="0.01" /></div>
        <div class="row"><label>Annual Growth Rate (%)</label><input v-model.number="annualGrowthRate" type="number" step="0.1" /></div>
        <div class="row"><label>Monthly Drawdown (£)</label><input v-model.number="monthlyDrawdown" type="number" min="0" step="0.01" /></div>
      </template>
      <template v-else-if="type === 'bank-account'">
        <div class="row"><label>Start Balance (£)</label><input v-model.number="startBalance" type="number" step="0.01" /></div>
      </template>
      <template v-else-if="type === 'income'">
        <div class="row"><label>Monthly Amount (£)</label><input v-model.number="monthlyAmount" type="number" min="0" step="0.01" /></div>
        <div class="row"><label>Annual Growth Rate (%)</label><input v-model.number="annualGrowthRate" type="number" step="0.1" /></div>
      </template>
      <template v-else-if="type === 'expenditure'">
        <div class="row"><label>Monthly Amount (£)</label><input v-model.number="monthlyAmount" type="number" min="0" step="0.01" /></div>
      </template>
      <template v-else-if="type === 'event'">
        <div class="row">
          <label>Direction</label>
          <select v-model="direction">
            <option value="out">Money out</option>
            <option value="in">Money in</option>
          </select>
        </div>
        <div class="row"><label>Amount (£)</label><input v-model.number="eventAmount" type="number" min="0" step="0.01" /></div>
      </template>
      <template v-else-if="type === 'liability'">
        <div class="row"><label>Balance (£)</label><input v-model.number="balance" type="number" min="0" step="0.01" /></div>
        <div class="row"><label>Annual Interest Rate (%)</label><input v-model.number="annualInterestRate" type="number" step="0.1" /></div>
        <div class="row"><label>Monthly Repayment (£)</label><input v-model.number="monthlyRepayment" type="number" min="0" step="0.01" /></div>
      </template>
    </div>

    <div class="nav">
      <button v-if="isEditing" type="button" class="reset" @click="cancel">Cancel</button>
      <button v-else type="button" class="reset" @click="reset">Reset</button>
      <button type="button" class="ghost" :disabled="step === 0" @click="back">← Back</button>
      <button v-if="!isLast" type="button" class="next" :disabled="!canAdvance" @click="next">Next →</button>
      <button v-else type="submit" class="add" :disabled="!isValid">{{ isEditing ? 'Save' : 'Add' }}</button>
    </div>
  </form>
</template>

<style scoped>
.item-form {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1.5rem;
  max-width: 480px;
}
.wizard-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1.1rem;
}
h2 { margin: 0; font-size: 1.1rem; }
.progress { font-size: 0.75rem; color: #999; }
.step { min-height: 132px; }
.row {
  display: grid;
  grid-template-columns: 160px 1fr;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}
label { font-size: 0.85rem; color: #555; }
input, select {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 100%;
  box-sizing: border-box;
}
.nav {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.nav button {
  padding: 0.45rem 1.2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}
.nav .ghost { margin-left: auto; }
.nav .next, .nav .add { color: #fff; }
.nav .next { background: #333; }
.nav .add { background: #1a5c3a; }
.nav .ghost { background: #f0f0f0; color: #555; }
.nav .reset { background: none; color: #999; padding-left: 0; }
.nav .reset:hover { color: #c00; }
.nav button:disabled { background: #eee; color: #bbb; cursor: not-allowed; }
.nav .next:disabled, .nav .add:disabled { background: #ccc; color: #fff; }
</style>
