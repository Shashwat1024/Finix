'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatMessage } from '@/types'
import { Send, ChevronUp, SquarePen, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  initialHistory: ChatMessage[]
  userId: string
  totalCount: number
}

const PAGE_SIZE = 50

const QUICK_PROMPTS = [
  'How much did I spend on food last month?',
  'Show my current portfolio summary',
  'What is the sentiment on INFY?',
  'Which category am I overspending in?',
]

export default function ChatWindow({ initialHistory, totalCount }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [offset, setOffset] = useState(Math.max(0, totalCount - PAGE_SIZE))
  const [hasMore, setHasMore] = useState(totalCount > PAGE_SIZE)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || offset <= 0) return
    setLoadingOlder(true)
    const newOffset = Math.max(0, offset - PAGE_SIZE)
    try {
      const res = await fetch(`/api/chat/history?offset=${newOffset}&limit=${PAGE_SIZE}`)
      const data = await res.json()
      if (res.ok && data.messages?.length) {
        const scrollEl = scrollRef.current
        const prevScrollHeight = scrollEl?.scrollHeight ?? 0
        setMessages((prev) => [...data.messages, ...prev])
        setOffset(newOffset)
        setHasMore(newOffset > 0)
        // Preserve scroll position after prepending
        requestAnimationFrame(() => {
          if (scrollEl) {
            scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight
          }
        })
      } else {
        setHasMore(false)
      }
    } finally {
      setLoadingOlder(false)
    }
  }, [offset, loadingOlder])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      user_id: '',
      role: 'user',
      content: text,
      tool_calls: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        user_id: '',
        role: 'assistant',
        content: res.ok ? data.content : `Error: ${data.error}`,
        tool_calls: data.toolCalls ?? null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        user_id: '',
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        tool_calls: null,
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  async function clearChat() {
    setClearing(true)
    await fetch('/api/chat/history', { method: 'DELETE' })
    setMessages([])
    setOffset(0)
    setHasMore(false)
    setConfirmClear(false)
    setClearing(false)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {messages.length > 0 ? `${messages.length} messages` : 'New conversation'}
        </span>
        <div className="flex items-center gap-1">
          {/* New chat (just clears UI, keeps history in DB) */}
          <button
            onClick={() => { setMessages([]); setHasMore(false) }}
            title="New chat"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors"
          >
            <SquarePen className="h-3.5 w-3.5" />
            New chat
          </button>
          {/* Clear — deletes from DB */}
          {messages.length > 0 && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              title="Clear history"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 px-2 py-1 rounded-md hover:bg-secondary transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
          {confirmClear && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-400">Delete all history?</span>
              <button
                onClick={clearChat}
                disabled={clearing}
                className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {clearing ? 'Clearing…' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <ChevronUp className="h-3 w-3" />
              {loadingOlder ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-muted-foreground text-sm mb-4">Ask me about your finances</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-secondary transition-colors text-muted-foreground text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] sm:max-w-[75%] rounded-lg px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.tool_calls && msg.tool_calls.length > 0 && (
                <p className="text-xs mt-1 opacity-60">
                  Used: {msg.tool_calls.map((t) => t.name).join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-4 py-2.5 text-sm text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances…"
            className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="rounded-md bg-primary px-3 py-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            <Send className="h-4 w-4 text-primary-foreground" />
          </button>
        </form>
      </div>
    </div>
  )
}
