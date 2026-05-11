# FinAgent — Developer Guide

## Dev Commands

```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
```

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in keys
2. Create a Supabase project, run `supabase/schema.sql` in the SQL editor
3. Enable Email auth in Supabase Auth → Providers
4. `npm install && npm run dev`

## Project Structure

```
src/
├── app/
│   ├── (auth)/login | signup        # Auth pages
│   ├── (dashboard)/                 # Protected pages (layout checks auth)
│   │   ├── dashboard/               # Expense donut + portfolio + insights
│   │   ├── chat/                    # AI chat with tool-calling
│   │   ├── paper-trading/           # Watchlist + holdings + trade log
│   │   └── reports/                 # Monthly AI reports
│   └── api/
│       ├── auth/callback | onboard  # Auth flow
│       ├── sync/                    # DHAN transaction + holdings sync
│       ├── chat/                    # Agent orchestrator endpoint
│       ├── paper-trade/             # Execute/list paper trades
│       ├── reports/                 # Generate monthly report
│       └── watchlist/               # Add/remove watchlist items
├── components/
│   ├── layout/Sidebar               # Nav sidebar
│   ├── dashboard/                   # ExpenseDonut, SpendTrend, PortfolioSnapshot, InsightsCard
│   ├── chat/ChatWindow              # Chat UI with quick prompts
│   ├── paper-trading/               # Watchlist, Holdings, TradeLog
│   └── reports/ReportView           # Report display + generate button
├── lib/
│   ├── supabase/client | server     # Browser/server Supabase clients
│   ├── dhan/client                  # DHAN API wrapper + token encrypt/decrypt
│   ├── openai/agent | tools         # Agent orchestrator + 5 tool handlers
│   ├── categorize                   # Rule-based + AI transaction categorization
│   └── utils                        # cn(), formatCurrency(), date helpers
├── types/index.ts                   # All shared TypeScript types
└── middleware.ts                    # Auth redirect middleware
supabase/schema.sql                  # Full DB schema with RLS policies
```

## Key Patterns

- All API routes call `supabase.auth.getUser()` first — no cross-user data leakage
- DHAN tokens are base64-encoded at rest (upgrade to AES-256 before production)
- Agent loop: `runAgent()` in `lib/openai/agent.ts` uses Gemini 2.0 Flash with function calling; runs up to 5 iterations; tools execute in parallel
- Paper trade prices are random placeholders — wire up `DhanClient.getQuote()` for real prices
- Categorization: rule-based first, falls back to GPT-4o-mini if `OPENAI_API_KEY` present

## Environment Variables

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings |
| `GEMINI_API_KEY` | aistudio.google.com/app/apikey |
| `NEWSAPI_KEY` | newsapi.org (free) |
| `FINNHUB_KEY` | finnhub.io (optional) |

---

# FinAgent PRD v1.0 (Locked for 14-Day Build)

## 1) Product Definition

- Product name: `FinAgent`
- Primary user: Student/young investor in India with a DHAN account
- Core problem: Users struggle to understand spending patterns and connect them to investing decisions
- MVP outcome: A web app that ingests user financial data, explains spending/portfolio status, and gives actionable guidance via chat + dashboards

## 2) Objectives & Non-Objectives

### Objectives (Phase 1)

- Unified finance dashboard (expenses + portfolio snapshot)
- AI chatbot grounded in user data
- Paper-trading simulation with reasoning
- Monthly AI financial report

### Non-objectives (Phase 1)

- Real order placement
- Mobile app
- Full autonomous trading bot
- Advanced ML forecasting pipelines
- Public/open signup

## 3) Users & Access Model

- User group: Closed group (3–5 members), each with own DHAN token
- Access control: Email/password auth
- Data isolation: Strict per-user row ownership and query scoping
- Risk profile input: `conservative | moderate | aggressive`

## 4) MVP Features (Must Ship)

### F1. Authentication & Onboarding

- Signup/login
- Capture risk profile
- Store encrypted DHAN token

### F2. Data Sync + Expense Categorization

- Pull last 90 days transactions (or as available)
- Categorize into `Food, Transport, Entertainment, Investments, Utilities, Healthcare, Shopping, Others`
- Save categorized transactions

### F3. Dashboard

- Current month expense donut
- Month-over-month spend trend
- Portfolio snapshot card
- Top insights card (plain-language)

### F4. Financial Chat (Primary UX)

- Chat with tool-calling over user data
- Must reliably answer:
  - Spend by category/date range
  - Current portfolio summary
  - Stock news/sentiment summary
- Include "I don't have enough data" fallback behavior

### F5. Paper Trading (Basic)

- Watchlist
- AI signal (`Strong Buy/Buy/Hold/Sell/Strong Sell`) + reason
- Simulate buy/sell on paper balance
- Holdings + trade log + unrealized P&L

### F6. Monthly Financial Report

- Single generated report for current/last month:
  - Spending insights
  - Portfolio health score (heuristic)
  - 2–3 personalized actions

## 5) Stretch Features (Only if MVP Done Early)

- Rule-based alerts (price/spending/portfolio)
- News polling every 6h
- Benchmark vs Nifty advanced charts
- PDF export of monthly report

## 6) Functional Requirements (Concise)

- FR-01: User can authenticate and manage session
- FR-02: User can connect DHAN token; token is encrypted at rest
- FR-03: System can sync transactions and holdings on demand
- FR-04: System categorizes transactions and stores categories
- FR-05: User can view expense and portfolio dashboards
- FR-06: Chatbot can call tools and return grounded answers
- FR-07: User can run paper trades (buy/sell) with validation
- FR-08: System can generate monthly report per user
- FR-09: All reads/writes are user-scoped (no cross-user leakage)

## 7) Non-Functional Requirements

- Performance: Dashboard/API responses under ~2s for cached data
- Reliability: Graceful degradation when API providers fail
- Security: Server-only token decrypt, no secrets in client
- Auditability: Store tool calls and critical actions in logs
- Usability: Demo flows complete in 5 clicks/page for key paths

## 8) Technical Architecture (Locked)

- Frontend: Next.js 14 + TypeScript + Tailwind + shadcn/ui
- Backend: Next.js API routes
- Database/Auth: Supabase Postgres + Supabase Auth
- AI: OpenAI GPT-4o function calling (Gemini fallback optional, not mandatory for MVP)
- Market/News: DHAN + NewsAPI/Finnhub
- Agent pattern: Single orchestrator loop + modular tool handlers

## 9) Data Model (MVP Tables)

Required MVP entities:

- `user_profiles`
- `transactions`
- `paper_holdings`
- `paper_trades`
- `watchlist`
- `chat_messages`
- `monthly_reports`

Optional for stretch:

- `alerts`

## 10) Tooling Contract for Chat Agent (MVP)

Minimum tool set:

- `get_expense_summary(from_date, to_date, category)`
- `get_portfolio_holdings()`
- `get_stock_news(ticker)`
- `get_stock_signal(ticker)`
- `simulate_trade(ticker, action, quantity)`

Behavior rules:

- Never invent balances or prices
- If tool fails, explain limitation and suggest retry
- Financial advice must be educational + uncertainty-aware

## 11) Success Metrics (Definition of Done)

MVP is "done" only if all are met:

- D1: End-to-end demo works for 3 users with isolated data
- D2: Expense categorization correctness ≥ 80% on sampled transactions
- D3: Chat answers 10–12 predefined test queries correctly using tool data
- D4: Paper trading executes and updates holdings/log correctly for 5 scenarios
- D5: One monthly report generated per user with non-empty structured sections
- D6: No secret/token exposed in browser/network payloads

## 12) Risks & Mitigations

- DHAN rate/availability risk:
  - Mitigate with DB cache + manual sync button + retry/backoff

- Scope creep:
  - Freeze MVP features; stretch only after D1–D6 pass

- LLM hallucination:
  - Enforce tool-first policy; explicit "insufficient data" fallback

- Team delivery variance:
  - Split ownership by module; integrate daily

## 13) Team Split (Suggested)

- Member A: Auth + Supabase schema + data sync
- Member B: Dashboard UI + charts + report view
- Member C: Orchestrator + tools + chat
- Member D (optional): Paper trading logic + watchlist/news
- Member E (optional): QA, test scripts, deployment, demo prep

## 14) 14-Day Execution Plan (Locked)

- Day 1–2: Project scaffold, auth, DB schema, env wiring
- Day 3–4: DHAN sync + transactions + categorization pipeline
- Day 5–6: Dashboard + expense insights
- Day 7–8: Orchestrator + tool calls + chat UI
- Day 9–10: Paper trading core + watchlist + signal cards
- Day 11: Monthly report generation + page
- Day 12: Hardening, edge-case handling, logging
- Day 13: QA pass against D1–D6 checklist
- Day 14: Deploy + final demo rehearsal

## 15) Demo Acceptance Script (Evaluator Flow)

- Login as test user
- Sync data
- View expense breakdown + trend
- Ask chatbot:
  - "How much did I spend on food last month"
  - "Show my current portfolio summary"
  - "What is the sentiment on INFY"
- Simulate one paper trade
- Open monthly report and explain recommendations
