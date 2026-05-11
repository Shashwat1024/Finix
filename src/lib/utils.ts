import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { TransactionCategory } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function getDateRange(months = 3): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - months)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

export function getMonthRange(offset = 0): { from: string; to: string; label: string } {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)
  const year = date.getFullYear()
  const month = date.getMonth()
  const from = new Date(year, month, 1).toISOString().split('T')[0]
  const to = new Date(year, month + 1, 0).toISOString().split('T')[0]
  const label = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date)
  return { from, to, label }
}

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Entertainment: '#a855f7',
  Investments: '#22c55e',
  Utilities: '#eab308',
  Healthcare: '#ec4899',
  Shopping: '#14b8a6',
  Others: '#94a3b8',
}

export const CATEGORIES: TransactionCategory[] = [
  'Food',
  'Transport',
  'Entertainment',
  'Investments',
  'Utilities',
  'Healthcare',
  'Shopping',
  'Others',
]
