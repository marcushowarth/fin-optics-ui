export type ItemType = 'asset' | 'investment' | 'bank-account' | 'income' | 'expenditure' | 'liability' | 'event'

export interface ScenarioDefinition {
  name: string
  annualRate: number
}

export interface FinancialItemBase {
  type: ItemType
  name: string
  description: string
}

export interface AssetItem extends FinancialItemBase {
  type: 'asset'
  start: string
  startValue: number
  annualGrowthRate: number
  saleDate?: string
}

export interface InvestmentItem extends FinancialItemBase {
  type: 'investment'
  start: string
  startValue: number
  annualGrowthRate: number
  drawdownStart?: string
  monthlyDrawdown?: number
}

export interface BankAccountItem extends FinancialItemBase {
  type: 'bank-account'
  startBalance: number
}

export interface IncomeItem extends FinancialItemBase {
  type: 'income'
  start: string
  end?: string
  monthlyAmount: number
  annualGrowthRate: number
}

export interface ExpenditureItem extends FinancialItemBase {
  type: 'expenditure'
  start: string
  end?: string
  monthlyAmount: number
  annualGrowthRate: number
}

export interface LiabilityItem extends FinancialItemBase {
  type: 'liability'
  start: string
  balance: number
  annualInterestRate: number
  monthlyRepayment: number
}

// A one-off, dated cash movement. Signed amount: positive = money in, negative
// = money out. No lifecycle — a single flow at `date`.
export interface FinancialEventItem extends FinancialItemBase {
  type: 'event'
  date: string
  amount: number
}

export type FinancialItem =
  | AssetItem
  | InvestmentItem
  | BankAccountItem
  | IncomeItem
  | ExpenditureItem
  | LiabilityItem
  | FinancialEventItem

export interface ProjectionRequest {
  from: string
  to: string
  base: string
  items: FinancialItem[]
  scenarios: ScenarioDefinition[]
}

export interface SolvencyWarning {
  month: string
  cashPosition: number
}

export interface NominalProjection {
  netWorth: Record<string, number>
  cashPosition: Record<string, number>
  itemPositions: Record<string, Record<string, number>>
  warnings: SolvencyWarning[]
}

export interface RealTermsProjection {
  base: string
  netWorth: Record<string, Record<string, number>>
  cashPosition: Record<string, Record<string, number>>
  itemPositions: Record<string, Record<string, Record<string, number>>>
}

export interface ProjectionResponse {
  nominal: NominalProjection
  realTerms: RealTermsProjection | null
}
