// Shared `step` increments for currency amount inputs (#946 follow-up).
//
// The native `step` attribute doubles as a browser constraint-validation rule,
// not just the spinner/arrow-key increment — see ItemForm.vue's `novalidate`
// comment for why the form itself never lets `step` block submission. These
// values exist purely to make the spinner/arrow-key increment sensible for
// each field's typical magnitude (e.g. a Start Value in the tens of thousands
// shouldn't creep up by a penny at a time).
//
// Three tiers cover every £ amount field in the app:
//  - STEP_LARGE  (10,000) — Asset/Investment Start Value, Liability Balance
//  - STEP_MEDIUM (1,000)  — one-off Event Amount
//  - STEP_SMALL  (100)    — monthly figures (Income/Expenditure Amount,
//                            Investment Drawdown, Liability Repayment)
//
// ItemForm.vue imports the tier constants directly, since some item types
// (investment, liability) show two amount fields at different tiers.
// PlanGrid.vue's inline grid only ever surfaces one amount field per type
// (see its AMOUNT_FIELD map), so AMOUNT_STEP below collapses that down to a
// single per-type lookup.

import type { ItemType } from '../types'

export const STEP_LARGE = 10000
export const STEP_MEDIUM = 1000
export const STEP_SMALL = 100

// Mirrors PlanGrid.vue's AMOUNT_FIELD — the step for whichever amount field
// the grid's shared inline cell is currently editing for that item type.
export const AMOUNT_STEP: Record<ItemType, number> = {
  asset: STEP_LARGE,        // startValue
  investment: STEP_LARGE,   // startValue
  income: STEP_SMALL,       // monthlyAmount
  expenditure: STEP_SMALL,  // monthlyAmount
  liability: STEP_LARGE,    // balance
  event: STEP_MEDIUM,       // amount
}
