import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgent } from '@/lib/openai/agent'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await request.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  // Save user message
  await supabase.from('chat_messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
  })

  // Load recent history
  const { data: history } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  try {
    const { content, toolCalls } = await runAgent(
      user.id,
      message,
      (history ?? []).reverse()
    )

    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : null,
    })

    return NextResponse.json({ content, toolCalls })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Agent error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
