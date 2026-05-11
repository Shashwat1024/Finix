'use client'

import { useState } from 'react'
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Article {
  title: string
  summary: string
  sentiment: string
  published_at: string
  url: string
}

interface Props {
  tickers: string[]
}

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'text-green-400 bg-green-500/10 border-green-500/30',
  negative: 'text-red-400 bg-red-500/10 border-red-500/30',
  neutral: 'text-muted-foreground bg-secondary border-border',
}

export default function NewsPanel({ tickers }: Props) {
  const [selectedTicker, setSelectedTicker] = useState(tickers[0] ?? '')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [ageMinutes, setAgeMinutes] = useState<number | null>(null)
  const [fetched, setFetched] = useState(false)

  async function loadNews(ticker: string, force = false) {
    if (!ticker) return
    setLoading(true)
    setSelectedTicker(ticker)
    const url = `/api/news?ticker=${ticker}${force ? '&force=1' : ''}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      setArticles(data.articles ?? [])
      setAgeMinutes(data.age_minutes ?? null)
      setFetched(true)
    } finally {
      setLoading(false)
    }
  }

  if (tickers.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex-1">Market News</h2>
        {ageMinutes !== null && (
          <span className="text-[10px] text-muted-foreground">
            cached {ageMinutes}m ago
          </span>
        )}
        {fetched && (
          <button
            onClick={() => loadNews(selectedTicker, true)}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh news"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {tickers.map((t) => (
          <button
            key={t}
            onClick={() => loadNews(t)}
            className={cn(
              'text-xs rounded-full px-3 py-1 border transition-colors font-medium',
              selectedTicker === t && fetched
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {!fetched && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Select a ticker to load news
        </p>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="h-3 bg-secondary rounded w-3/4" />
              <div className="h-2.5 bg-secondary/60 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && fetched && articles.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No news found for {selectedTicker}. Check your NewsAPI key.
        </p>
      )}

      {!loading && articles.length > 0 && (
        <div className="space-y-3">
          {articles.map((a, i) => (
            <div key={i} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
              <div className="flex items-start gap-2 justify-between">
                <p className="text-xs font-medium leading-relaxed flex-1">{a.title}</p>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 font-medium', SENTIMENT_STYLES[a.sentiment] ?? SENTIMENT_STYLES.neutral)}>
                  {a.sentiment}
                </span>
              </div>
              {a.summary && (
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{a.summary}</p>
              )}
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(a.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    Read <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
