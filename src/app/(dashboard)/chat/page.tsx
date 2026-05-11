import { createClient } from '@/lib/supabase/server'
import ChatWindow from '@/components/chat/ChatWindow'

const PAGE_SIZE = 50

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)

  const totalCount = count ?? 0
  const offset = Math.max(0, totalCount - PAGE_SIZE)

  const { data: history } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Financial Chat</h1>
        <p className="text-muted-foreground text-sm mt-1">Ask me anything about your finances</p>
      </div>
      <ChatWindow initialHistory={history ?? []} userId={user!.id} totalCount={totalCount} />
    </div>
  )
}
