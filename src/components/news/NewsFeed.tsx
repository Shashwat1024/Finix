'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ExternalLink, Clock, Newspaper, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Article {
  title: string
  summary: string
  sentiment: 'positive' | 'negative' | 'neutral'
  published_at: string
  url: string
  source: string
  image: string
}

interface Props {
  watchlistTickers: string[]
}

const SENTIMENT_CONFIG = {
  positive: { label: 'Positive', class: 'text-green-400 bg-green-500/10 border-green-500/30' },
  negative: { label: 'Negative', class: 'text-red-400 bg-red-500/10 border-red-500/30' },
  neutral:  { label: 'Neutral',  class: 'text-muted-foreground bg-secondary/60 border-border' },
}

// Stable source-colour from name hash
function sourceColor(name: string) {
  const palette = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ec4899','#f97316','#06b6d4','#6366f1']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return palette[(h >>> 0) % palette.length]
}

function SourceAvatar({ source }: { source: string }) {
  const initials = source.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
  const bg = sourceColor(source)
  return (
    <div className="w-16 h-16 rounded-md shrink-0 flex items-center justify-center text-white font-bold text-sm select-none"
      style={{ background: bg + '22', border: `1px solid ${bg}44`, color: bg }}>
      {initials}
    </div>
  )
}

function ArticleCard({ article }: { article: Article }) {
  const [imgFailed, setImgFailed] = useState(false)
  const sent = SENTIMENT_CONFIG[article.sentiment] ?? SENTIMENT_CONFIG.neutral
  const date = new Date(article.published_at)
  const now = Date.now()
  const diffH = Math.round((now - date.getTime()) / 3600000)
  const timeAgo = diffH < 1 ? 'just now' : diffH < 24 ? `${diffH}h ago` : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const showImage = article.image && !imgFailed

  return (
    <div className="group rounded-lg border border-border bg-card hover:border-border/70 hover:bg-card/80 transition-all p-4">
      <div className="flex gap-3">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt=""
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-md object-cover shrink-0 bg-secondary"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <SourceAvatar source={article.source} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2 justify-between mb-1">
            <p className="text-sm font-medium leading-snug line-clamp-2 flex-1 group-hover:text-foreground transition-colors">
              {article.title}
            </p>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 font-semibold', sent.class)}>
              {sent.label}
            </span>
          </div>
          {article.summary && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
              {article.summary}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
              {article.source && (
                <>
                  <span>·</span>
                  <span>{article.source}</span>
                </>
              )}
            </div>
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-[11px] text-primary hover:underline"
              >
                Read <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SentimentBar({ articles }: { articles: Article[] }) {
  if (!articles.length) return null
  const pos = articles.filter((a) => a.sentiment === 'positive').length
  const neg = articles.filter((a) => a.sentiment === 'negative').length
  const neu = articles.filter((a) => a.sentiment === 'neutral').length
  const total = articles.length

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide shrink-0">Sentiment</p>
      <div className="flex-1 flex rounded-full overflow-hidden h-2 bg-secondary">
        <div className="bg-green-500 h-full transition-all" style={{ width: `${(pos / total) * 100}%` }} />
        <div className="bg-slate-500 h-full transition-all" style={{ width: `${(neu / total) * 100}%` }} />
        <div className="bg-red-500 h-full transition-all" style={{ width: `${(neg / total) * 100}%` }} />
      </div>
      <div className="flex gap-3 text-[11px] shrink-0">
        <span className="text-green-400">{pos} pos</span>
        <span className="text-muted-foreground">{neu} neu</span>
        <span className="text-red-400">{neg} neg</span>
      </div>
    </div>
  )
}

type Tab = '__market__' | string

export default function NewsFeed({ watchlistTickers }: Props) {
  const tabs: { id: Tab; label: string }[] = [
    { id: '__market__', label: 'Market' },
    ...watchlistTickers.map((t) => ({ id: t, label: t })),
  ]

  const [activeTab, setActiveTab] = useState<Tab>('__market__')
  const [articlesByTab, setArticlesByTab] = useState<Record<string, Article[]>>({})
  const [loadingTab, setLoadingTab] = useState<Tab | null>(null)
  const [ageByTab, setAgeByTab] = useState<Record<string, number | null>>({})

  const fetchTab = useCallback(async (tab: Tab, force = false) => {
    if (loadingTab === tab && !force) return
    setLoadingTab(tab)
    try {
      const url = tab === '__market__'
        ? `/api/news/market${force ? '?force=1' : ''}`
        : `/api/news?ticker=${tab}${force ? '&force=1' : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setArticlesByTab((prev) => ({ ...prev, [tab]: data.articles ?? [] }))
      setAgeByTab((prev) => ({ ...prev, [tab]: data.age_minutes ?? null }))
    } finally {
      setLoadingTab(null)
    }
  }, [loadingTab])

  // Load market news on mount
  useEffect(() => {
    fetchTab('__market__')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    if (!articlesByTab[tab]) fetchTab(tab)
  }

  const articles = articlesByTab[activeTab] ?? []
  const isLoading = loadingTab === activeTab
  const age = ageByTab[activeTab]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
            )}
          >
            {tab.id === '__market__' ? <Newspaper className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {tab.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {age !== null && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> cached {age}m ago
            </span>
          )}
          <button
            onClick={() => fetchTab(activeTab, true)}
            disabled={isLoading}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Sentiment bar */}
      {!isLoading && articles.length > 0 && <SentimentBar articles={articles} />}

      {/* Articles */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-md bg-secondary shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-secondary rounded w-4/5" />
                  <div className="h-3 bg-secondary/60 rounded w-full" />
                  <div className="h-3 bg-secondary/60 rounded w-2/3" />
                  <div className="h-2.5 bg-secondary/40 rounded w-1/3 mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && articles.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            {activeTab === '__market__'
              ? 'No market news available. Check your FINNHUB_KEY in .env.local.'
              : `No news found for ${activeTab}. It may not be covered by Finnhub's NSE data.`}
          </p>
        </div>
      )}

      {!isLoading && articles.length > 0 && (
        <div className="space-y-3">
          {articles.map((article, i) => (
            <ArticleCard key={i} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
