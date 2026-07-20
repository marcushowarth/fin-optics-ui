import { describe, it, expect } from 'vitest'
import { itemDetails } from '../itemDetails'
import type {
  AssetItem, ExpenditureItem, FinancialEventItem, IncomeItem, InvestmentItem, LiabilityItem,
} from '../../types'

describe('itemDetails', () => {
  describe('AssetItem', () => {
    it('includes Sale Date and Description when set', () => {
      const item: AssetItem = {
        type: 'asset', name: 'House', description: 'Family home',
        start: '2027-01', startValue: 300000, annualGrowthRate: 0.035, saleDate: '2035-06',
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2027' },
        { label: 'Sale Date', value: 'Jun 2035' },
        { label: 'Start Value', value: '£300,000.00' },
        { label: 'Annual Growth Rate', value: '3.5%' },
        { label: 'Description', value: 'Family home' },
      ])
    })

    it('falls back to Ongoing and omits Description when unset', () => {
      const item: AssetItem = {
        type: 'asset', name: 'House', description: '',
        start: '2027-01', startValue: 300000, annualGrowthRate: 0.02,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2027' },
        { label: 'Sale Date', value: 'Ongoing' },
        { label: 'Start Value', value: '£300,000.00' },
        { label: 'Annual Growth Rate', value: '2%' },
      ])
    })
  })

  describe('InvestmentItem', () => {
    it('includes Drawdown Start, Monthly Drawdown and Description when set', () => {
      const item: InvestmentItem = {
        type: 'investment', name: 'ISA', description: 'Stocks & shares',
        start: '2026-01', startValue: 50000, annualGrowthRate: 0.05,
        drawdownStart: '2045-01', monthlyDrawdown: 2000,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2026' },
        { label: 'Start Value', value: '£50,000.00' },
        { label: 'Annual Growth Rate', value: '5%' },
        { label: 'Drawdown Start', value: 'Jan 2045' },
        { label: 'Monthly Drawdown', value: '£2,000.00' },
        { label: 'Description', value: 'Stocks & shares' },
      ])
    })

    it('omits Drawdown Start, Monthly Drawdown and Description when unset', () => {
      const item: InvestmentItem = {
        type: 'investment', name: 'ISA', description: '',
        start: '2026-01', startValue: 50000, annualGrowthRate: 0.05,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2026' },
        { label: 'Start Value', value: '£50,000.00' },
        { label: 'Annual Growth Rate', value: '5%' },
      ])
    })
  })

  describe('IncomeItem', () => {
    it('includes End and Description when set', () => {
      const item: IncomeItem = {
        type: 'income', name: 'Salary', description: 'Main job',
        start: '2026-01', end: '2050-01', monthlyAmount: 4000, annualGrowthRate: 0.03,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2026' },
        { label: 'End', value: 'Jan 2050' },
        { label: 'Monthly Amount', value: '£4,000.00' },
        { label: 'Annual Growth Rate', value: '3%' },
        { label: 'Description', value: 'Main job' },
      ])
    })

    it('falls back to Ongoing and omits Description when unset', () => {
      const item: IncomeItem = {
        type: 'income', name: 'Salary', description: '',
        start: '2026-01', monthlyAmount: 4000, annualGrowthRate: 0.03,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2026' },
        { label: 'End', value: 'Ongoing' },
        { label: 'Monthly Amount', value: '£4,000.00' },
        { label: 'Annual Growth Rate', value: '3%' },
      ])
    })
  })

  describe('ExpenditureItem', () => {
    it('includes End and Description when set', () => {
      const item: ExpenditureItem = {
        type: 'expenditure', name: 'Rent', description: 'Flat share',
        start: '2026-01', end: '2030-01', monthlyAmount: 1500, annualGrowthRate: 0.02,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2026' },
        { label: 'End', value: 'Jan 2030' },
        { label: 'Monthly Amount', value: '£1,500.00' },
        { label: 'Annual Growth Rate', value: '2%' },
        { label: 'Description', value: 'Flat share' },
      ])
    })

    it('falls back to Ongoing and omits Description when unset', () => {
      const item: ExpenditureItem = {
        type: 'expenditure', name: 'Rent', description: '',
        start: '2026-01', monthlyAmount: 1500, annualGrowthRate: 0.02,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2026' },
        { label: 'End', value: 'Ongoing' },
        { label: 'Monthly Amount', value: '£1,500.00' },
        { label: 'Annual Growth Rate', value: '2%' },
      ])
    })
  })

  describe('LiabilityItem', () => {
    it('includes Description when set', () => {
      const item: LiabilityItem = {
        type: 'liability', name: 'Mortgage', description: 'Main residence',
        start: '2026-01', balance: 200000, annualInterestRate: 0.04, monthlyRepayment: 1200,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2026' },
        { label: 'Balance', value: '£200,000.00' },
        { label: 'Annual Interest Rate', value: '4%' },
        { label: 'Monthly Repayment', value: '£1,200.00' },
        { label: 'Description', value: 'Main residence' },
      ])
    })

    it('omits Description when unset', () => {
      const item: LiabilityItem = {
        type: 'liability', name: 'Mortgage', description: '',
        start: '2026-01', balance: 200000, annualInterestRate: 0.04, monthlyRepayment: 1200,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Start', value: 'Jan 2026' },
        { label: 'Balance', value: '£200,000.00' },
        { label: 'Annual Interest Rate', value: '4%' },
        { label: 'Monthly Repayment', value: '£1,200.00' },
      ])
    })
  })

  describe('FinancialEventItem', () => {
    it('shows Direction "In" and Description when set (positive amount)', () => {
      const item: FinancialEventItem = {
        type: 'event', name: 'Inheritance', description: 'From grandparents',
        date: '2028-06', amount: 20000,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Date', value: 'Jun 2028' },
        { label: 'Direction', value: 'In' },
        { label: 'Amount', value: '£20,000.00' },
        { label: 'Description', value: 'From grandparents' },
      ])
    })

    it('shows Direction "Out" and omits Description when unset (negative amount)', () => {
      const item: FinancialEventItem = {
        type: 'event', name: 'Wedding', description: '',
        date: '2028-06', amount: -20000,
      }
      expect(itemDetails(item)).toEqual([
        { label: 'Date', value: 'Jun 2028' },
        { label: 'Direction', value: 'Out' },
        { label: 'Amount', value: '£20,000.00' },
      ])
    })
  })
})
