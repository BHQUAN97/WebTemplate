import { FunctionDeclaration } from '@google/generative-ai';

/**
 * Shared AI provider abstractions — Gemini, Mock, va tuong lai Groq/Ollama
 * phai adhere de AiService co the swap transparent.
 */

export type ProviderRole = 'user' | 'model' | 'system' | 'function';

/**
 * Message item trong conversation history gui cho provider.
 * - `functionResponse` dung khi role='function' — tool result feedback vao AI.
 * - `functionCalls` dung khi role='model' — model da request tool call o turn do
 *   (can preserve de Gemini protocol hieu context giua cac iteration).
 */
export interface ProviderMessage {
  role: ProviderRole;
  content: string;
  /** Neu la function result tu tool call — ten function + data JSON */
  functionResponse?: { name: string; response: unknown };
  /** Neu la model turn chua 1+ functionCall requests */
  functionCalls?: Array<{ name: string; args: Record<string, any> }>;
  /**
   * Thought signature tu Gemini 2.5+ — PHAI preserve khi gui lai history
   * de tiep tuc cuoc tool-call roi follow-up. Neu thieu, Gemini 400 voi:
   * "Function call is missing a thought_signature in functionCall parts".
   */
  thoughtSignature?: string;
}

/**
 * Yeu cau model sinh 1 cau tra loi.
 */
export interface ProviderChatInput {
  messages: ProviderMessage[];
  systemInstruction?: string;
  tools?: FunctionDeclaration[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Ket qua tra ve tu provider — text hoac function calls (mutually exclusive per turn).
 */
export interface ProviderChatResult {
  text: string;
  toolCalls?: Array<{ name: string; args: Record<string, any> }>;
  /**
   * Thought signature (Gemini 2.5+) — return de caller preserve khi feed history
   * vao iteration sau cho tool-call workflow.
   */
  thoughtSignature?: string;
  usage?: { input?: number; output?: number; total?: number };
  model?: string;
  finishReason?: string;
}

export interface IAiProvider {
  chat(input: ProviderChatInput): Promise<ProviderChatResult>;
  readonly name: string;
}
