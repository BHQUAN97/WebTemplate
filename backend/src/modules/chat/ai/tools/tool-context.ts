/**
 * Tool authorization context — truyen vao moi tool call de enforce permission.
 *
 * Nguyen tac bao mat:
 *  - Principle of Least Privilege: AI chi doc duoc du lieu ma actor context duoc phep
 *  - Cross-user isolation: CUSTOMER khong xem duoc don cua CUSTOMER khac
 *  - Read-only: cac tool khong duoc mutate data (enforce o readonly-repo)
 *  - Rate limit: chat toi da N calls / conversation / hour
 *  - Audit: moi tool call log vao `chat_tool_calls`
 */

/** Loai actor — quyet dinh tool nao duoc goi va pham vi du lieu. */
export enum ChatActorType {
  GUEST = 'guest', // khach chua login
  CUSTOMER = 'customer', // khach da login (conversation.customerId != null)
  AGENT = 'agent', // nhan vien ho tro
  ADMIN = 'admin',
}

/**
 * Context truyen kem moi tool call — AI orchestrator build tu conversation.
 */
export interface ChatToolContext {
  conversationId: string;
  actor: ChatActorType;
  customerId?: string; // chi co khi CUSTOMER authenticated
  customerEmail?: string;
  customerPhone?: string;
  sessionId?: string; // customerSessionId (guest)
  toolCallCount?: number; // tracking quota
}

/**
 * Ma tran quyen — moi tool liet ke actor types duoc phep goi.
 * Tool nao khong co trong matrix → chan mac dinh (deny-by-default).
 */
export const PERMISSION_MATRIX = {
  search_products: [
    ChatActorType.GUEST,
    ChatActorType.CUSTOMER,
    ChatActorType.AGENT,
    ChatActorType.ADMIN,
  ],
  get_product_by_id: [
    ChatActorType.GUEST,
    ChatActorType.CUSTOMER,
    ChatActorType.AGENT,
    ChatActorType.ADMIN,
  ],
  search_orders: [
    ChatActorType.CUSTOMER,
    ChatActorType.AGENT,
    ChatActorType.ADMIN,
  ], // KHONG GUEST
  get_order_details: [
    ChatActorType.CUSTOMER,
    ChatActorType.AGENT,
    ChatActorType.ADMIN,
  ],
  search_faq: [
    ChatActorType.GUEST,
    ChatActorType.CUSTOMER,
    ChatActorType.AGENT,
    ChatActorType.ADMIN,
  ],
  get_promotions: [
    ChatActorType.GUEST,
    ChatActorType.CUSTOMER,
    ChatActorType.AGENT,
    ChatActorType.ADMIN,
  ],
  get_shipping_policy: [
    ChatActorType.GUEST,
    ChatActorType.CUSTOMER,
    ChatActorType.AGENT,
    ChatActorType.ADMIN,
  ],
} as const;

export type ToolName = keyof typeof PERMISSION_MATRIX;

/**
 * Kiem tra actor co duoc goi tool hay khong. Deny-by-default: tool la khong biet → false.
 */
export function isAllowed(toolName: string, actor: ChatActorType): boolean {
  const allowed = (
    PERMISSION_MATRIX as Record<string, readonly ChatActorType[]>
  )[toolName];
  return Array.isArray(allowed) && allowed.includes(actor);
}

/**
 * Error type — AI loop catch va convert thanh functionResponse { error }
 * de model tu xu ly, khong crash pipeline.
 */
export class ToolPermissionDeniedError extends Error {
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'ToolPermissionDeniedError';
  }
}

export class ToolInputError extends Error {
  constructor(message = 'Invalid tool input') {
    super(message);
    this.name = 'ToolInputError';
  }
}

export class ToolRateLimitError extends Error {
  constructor(message = 'Tool rate limit exceeded') {
    super(message);
    this.name = 'ToolRateLimitError';
  }
}

/**
 * Helper — throw neu khong duoc phep. Goi o dau moi tool method.
 */
export function assertPermission(toolName: string, ctx: ChatToolContext): void {
  if (!ctx || !ctx.actor) {
    throw new ToolPermissionDeniedError('Missing actor context for tool call.');
  }
  if (!isAllowed(toolName, ctx.actor)) {
    throw new ToolPermissionDeniedError(
      `Actor "${ctx.actor}" khong duoc phep goi tool "${toolName}".`,
    );
  }
}

/**
 * Rate limit config — chat, tach bien tool order* vi nhay cam hon.
 */
export const TOOL_CALL_LIMITS = {
  MAX_PER_CONVERSATION_PER_HOUR: 60,
  MAX_PER_REPLY: 5,
  MAX_ORDER_LOOKUP_PER_HOUR: 10,
} as const;
