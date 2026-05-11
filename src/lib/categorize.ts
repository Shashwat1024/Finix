import { GoogleGenerativeAI } from '@google/generative-ai'
import { TransactionCategory } from '@/types'

const RULES: Array<{ pattern: RegExp; category: TransactionCategory }> = [
  { pattern: /swiggy|zomato|dominos|mcdonalds|kfc|pizza|restaurant|cafe|food|eat|hotel|dhaba|biryani/i, category: 'Food' },
  { pattern: /uber|ola|rapido|metro|irctc|railway|flight|bus|fuel|petrol|diesel|fastag|toll|parking/i, category: 'Transport' },
  { pattern: /netflix|amazon prime|hotstar|spotify|pvr|inox|cinema|movie|game|steam/i, category: 'Entertainment' },
  { pattern: /zerodha|groww|upstox|angel|iifl|mf|mutual fund|sip|nps|insurance|lic|hdfc life/i, category: 'Investments' },
  { pattern: /electricity|water|gas|broadband|wifi|internet|airtel|jio|bsnl|vi|vodafone|postpaid|prepaid|recharge/i, category: 'Utilities' },
  { pattern: /apollo|medplus|pharmacy|hospital|doctor|clinic|diagnostic|lab|medicine|health|dental/i, category: 'Healthcare' },
  { pattern: /amazon|flipkart|myntra|ajio|meesho|nykaa|shopping|mall|clothes|fashion|shoe/i, category: 'Shopping' },
]

export function categorizeTransaction(description: string): TransactionCategory {
  const desc = description.toLowerCase()
  for (const rule of RULES) {
    if (rule.pattern.test(desc)) return rule.category
  }
  return 'Others'
}

const VALID_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Investments', 'Utilities', 'Healthcare', 'Shopping', 'Others']

export async function categorizeWithAI(description: string): Promise<TransactionCategory> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return categorizeTransaction(description)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0, maxOutputTokens: 10 },
    })

    const result = await model.generateContent(
      `Classify this bank transaction into exactly one category. Return only the category name, nothing else.\nCategories: ${VALID_CATEGORIES.join(', ')}\nTransaction: ${description}`
    )

    const cat = result.response.text().trim() as TransactionCategory
    if (VALID_CATEGORIES.includes(cat)) return cat
  } catch {}

  return categorizeTransaction(description)
}
