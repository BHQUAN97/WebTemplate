import { registerAs } from '@nestjs/config';

/**
 * AI provider configuration — Gemini/Groq/Ollama/Mock.
 *
 * Provider selection:
 *  - 'gemini'  → Google Gemini API (free tier 15 req/min, 1500 req/day)
 *  - 'groq'    → Groq API (free tier, reserved for future)
 *  - 'ollama'  → Local Ollama (reserved for future)
 *  - 'mock'    → Canned responses (dev / fallback when API key missing)
 */
export default registerAs('ai', () => ({
  provider: process.env.AI_PROVIDER || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1024', 10),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  systemPromptPath: process.env.AI_SYSTEM_PROMPT_PATH || '',
  // Brand name dung trong system prompt — fallback sang APP_NAME
  brandName: process.env.AI_BRAND_NAME || process.env.APP_NAME || 'shop',
  // Timeout goi AI provider (ms)
  requestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '10000', 10),
  // Max tool call iterations trong 1 turn — chong infinite loop
  maxToolIterations: parseInt(process.env.AI_MAX_TOOL_ITERATIONS || '3', 10),
}));
