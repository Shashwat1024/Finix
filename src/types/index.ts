export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'

export interface UserProfile {
  id: string
  email: string
  risk_profile: RiskProfile
  dhan_token_encrypted: string | null
  paper_balance: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  transaction_id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  category: TransactionCategory
  raw_data: Record<string, unknown>
  created_at: string
}

export type TransactionCategory =
  | 'Food'
  | 'Transport'
  | 'Entertainment'
  | 'Investments'
  | 'Utilities'
  | 'Healthcare'
  | 'Shopping'
  | 'Others'

export interface PaperHolding {
  id: string
  user_id: string
  ticker: string
  company_name: string
  quantity: number
  avg_buy_price: number
  created_at: string
  updated_at: string
}

export interface PaperTrade {
  id: string
  user_id: string
  ticker: string
  action: 'buy' | 'sell'
  quantity: number
  price: number
  total_value: number
  created_at: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  ticker: string
  company_name: string
  added_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  tool_calls: ToolCall[] | null
  created_at: string
}

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
  result: unknown
}

export interface MonthlyReport {
  id: string
  user_id: string
  report_month: string
  spending_insights: SpendingInsights
  portfolio_health_score: number
  personalized_actions: string[]
  raw_data: Record<string, unknown>
  created_at: string
}

export interface SpendingInsights {
  total_spent: number
  by_category: Record<TransactionCategory, number>
  top_category: TransactionCategory
  vs_last_month_pct: number | null
  notable_transactions: string[]
}

export interface DhanHolding {
  securityId: string
  tradingSymbol: string
  totalQty: number
  dpQty: number
  t1Qty: number
  availableQty: number
  collateralQty: number
  avgCostPrice: number
  isin: string
}

export interface DhanTransaction {
  transactionId: string
  transactionDate: string
  narration: string
  amount: number
  balance: number
  transactionType: 'DEBIT' | 'CREDIT'
}

export interface StockSignal {
  ticker: string
  signal: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'
  reason: string
  confidence: number
}

export interface ExpenseSummary {
  from_date: string
  to_date: string
  category: TransactionCategory | 'All'
  total: number
  transactions: Transaction[]
  by_category: Partial<Record<TransactionCategory, number>>
}

export interface PortfolioHoldings {
  holdings: (PaperHolding & { current_price: number; unrealized_pnl: number; pnl_pct: number })[]
  total_invested: number
  current_value: number
  total_pnl: number
  paper_balance: number
}
