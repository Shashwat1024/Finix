import { GoogleGenerativeAI, Content, FunctionResponsePart } from '@google/generative-ai'
import { GEMINI_TOOLS, executeToolCall } from './tools'
import { ChatMessage } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM_PROMPT = `You are FinAgent, a personal finance assistant for Indian investors with DHAN accounts.

You have access to the user's real financial data via tools. Always use tools to fetch data before answering questions about spending, portfolio, or stocks. Never invent numbers.

Rules:
- Use get_expense_summary for any spending/expense questions
- Use get_portfolio_holdings for portfolio questions
- Use get_stock_news for news/sentiment questions
- Use get_stock_signal for buy/sell signal questions
- Use simulate_trade only when user explicitly asks to buy/sell
- If a tool returns empty data, say "I don't have enough data for that yet — try syncing your transactions first."
- All financial commentary is educational and for informational purposes only, not financial advice.
- Format currency in Indian Rupees (₹).`

function toGeminiHistory(history: ChatMessage[]): Content[] {
  return history.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

export async function runAgent(
  userId: string,
  userMessage: string,
  history: ChatMessage[]
): Promise<{ content: string; toolCalls: { name: string; arguments: Record<string, unknown>; result: unknown }[] }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
    tools: GEMINI_TOOLS,
  })

  const chat = model.startChat({ history: toGeminiHistory(history) })
  const recordedToolCalls: { name: string; arguments: Record<string, unknown>; result: unknown }[] = []

  let currentMessage: string | FunctionResponsePart[] = userMessage

  // Orchestrator loop — max 5 iterations
  for (let i = 0; i < 5; i++) {
    const result = await chat.sendMessage(currentMessage)
    const response = result.response
    const functionCalls = response.functionCalls()

    if (!functionCalls || functionCalls.length === 0) {
      return { content: response.text(), toolCalls: recordedToolCalls }
    }

    // Execute all function calls in parallel
    const toolResults = await Promise.all(
      functionCalls.map(async (fc) => {
        const args = fc.args as Record<string, unknown>
        let toolResult: unknown
        try {
          toolResult = await executeToolCall(fc.name, args, userId)
        } catch (err) {
          toolResult = { error: err instanceof Error ? err.message : 'Tool execution failed' }
        }
        recordedToolCalls.push({ name: fc.name, arguments: args, result: toolResult })
        return { functionResponse: { name: fc.name, response: toolResult as object } } as FunctionResponsePart
      })
    )

    currentMessage = toolResults
  }

  return { content: 'I was unable to complete the request. Please try again.', toolCalls: recordedToolCalls }
}
