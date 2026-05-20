<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectionStore } from '../stores/projection'
import MonthPicker from './MonthPicker.vue'
import type {
  ItemType, AssetItem, InvestmentItem, BankAccountItem,
  IncomeItem, ExpenditureItem, LiabilityItem, FinancialItem,
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

const TYPES: { value: ItemType; label: string }[] = [
  { value: 'asset',        label: 'Asset' },
  { value: 'investment',   label: 'Investment' },
  { value: 'bank-account', label: 'Bank Account' },
  { value: 'income',       label: 'Income' },
  { value: 'expenditure',  label: 'Expenditure' },
  { value: 'liability',    label: 'Liability' },
]

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
}

function submit() {
  if (!isValid.value) return
  let item: FinancialItem

  const base = { name: name.value.trim(), description: description.value.trim() }

  switch (type.value) {
    case 'asset': {
      const a: AssetItem = { ...base, type: 'asset', start: start.value, startValue: +startValue.value, annualGrowthRate: +annualGrowthRate.value }
      if (saleDate.value) a.saleDate = saleDate.value
      item = a
      break
    }
    case 'investment': {
      const inv: InvestmentItem = { ...base, type: 'investment', start: start.value, startValue: +startValue.value, annualGrowthRate: +annualGrowthRate.value }
      if (drawdownStart.value) inv.drawdownStart = drawdownStart.value
      if (monthlyDrawdown.value !== '') inv.monthlyDrawdown = +monthlyDrawdown.value
      item = inv
      break
    }
    case 'bank-account':
      item = { ...base, type: 'bank-account', startBalance: +startBalance.value } as BankAccountItem
      break
    case 'income': {
      const inc: IncomeItem = { ...base, type: 'income', start: start.value, monthlyAmount: +monthlyAmount.value, annualGrowthRate: +annualGrowthRate.value }
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
      item = { ...base, type: 'liability', start: start.value, balance: +balance.value, annualInterestRate: +annualInterestRate.value, monthlyRepayment: +monthlyRepayment.value } as LiabilityItem
      break
  }

  store.addItem(item)
  reset()
}
</script>

<template>
  <form class="item-form" @submit.prevent="submit">
    <h2>Add Item</h2>

    <div class="row">
      <label>Type</label>
      <select v-model="type">
        <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
    </div>

    <div class="row">
      <label>Name</label>
      <input v-model="name" type="text" placeholder="e.g. Main salary" required />
    </div>

    <div class="row">
      <label>Description</label>
      <input v-model="description" type="text" placeholder="Optional" />
    </div>

    <!-- Asset -->
    <template v-if="type === 'asset'">
      <div class="row"><label>Start</label><MonthPicker v-model="start" :required="true" /></div>
      <div class="row"><label>Start Value (£)</label><input v-model.number="startValue" type="number" min="0" step="0.01" required /></div>
      <div class="row"><label>Annual Growth Rate</label><input v-model.number="annualGrowthRate" type="number" step="0.001" required /></div>
      <div class="row"><label>Sale Date</label><MonthPicker v-model="saleDate" :min="start" :disabled="!start" /></div>
    </template>

    <!-- Investment -->
    <template v-else-if="type === 'investment'">
      <div class="row"><label>Start</label><MonthPicker v-model="start" :required="true" /></div>
      <div class="row"><label>Start Value (£)</label><input v-model.number="startValue" type="number" min="0" step="0.01" required /></div>
      <div class="row"><label>Annual Growth Rate</label><input v-model.number="annualGrowthRate" type="number" step="0.001" required /></div>
      <div class="row"><label>Drawdown Start</label><MonthPicker v-model="drawdownStart" :min="start" :disabled="!start" /></div>
      <div class="row"><label>Monthly Drawdown (£)</label><input v-model.number="monthlyDrawdown" type="number" min="0" step="0.01" /></div>
    </template>

    <!-- Bank Account -->
    <template v-else-if="type === 'bank-account'">
      <div class="row"><label>Start Balance (£)</label><input v-model.number="startBalance" type="number" step="0.01" required /></div>
    </template>

    <!-- Income -->
    <template v-else-if="type === 'income'">
      <div class="row"><label>Start</label><MonthPicker v-model="start" :required="true" /></div>
      <div class="row"><label>End</label><MonthPicker v-model="end" :min="start" :disabled="!start" /></div>
      <div class="row"><label>Monthly Amount (£)</label><input v-model.number="monthlyAmount" type="number" min="0" step="0.01" required /></div>
      <div class="row"><label>Annual Growth Rate</label><input v-model.number="annualGrowthRate" type="number" step="0.001" required /></div>
    </template>

    <!-- Expenditure -->
    <template v-else-if="type === 'expenditure'">
      <div class="row"><label>Start</label><MonthPicker v-model="start" :required="true" /></div>
      <div class="row"><label>End</label><MonthPicker v-model="end" :min="start" :disabled="!start" /></div>
      <div class="row"><label>Monthly Amount (£)</label><input v-model.number="monthlyAmount" type="number" min="0" step="0.01" required /></div>
    </template>

    <!-- Liability -->
    <template v-else-if="type === 'liability'">
      <div class="row"><label>Start</label><MonthPicker v-model="start" :required="true" /></div>
      <div class="row"><label>Balance (£)</label><input v-model.number="balance" type="number" min="0" step="0.01" required /></div>
      <div class="row"><label>Annual Interest Rate</label><input v-model.number="annualInterestRate" type="number" step="0.001" required /></div>
      <div class="row"><label>Monthly Repayment (£)</label><input v-model.number="monthlyRepayment" type="number" min="0" step="0.01" required /></div>
    </template>

    <button type="submit" :disabled="!isValid">Add</button>
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
h2 { margin: 0 0 1rem; font-size: 1.1rem; }
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
button {
  margin-top: 0.8rem;
  padding: 0.45rem 1.2rem;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}
button:disabled { background: #999; cursor: not-allowed; }
</style>
