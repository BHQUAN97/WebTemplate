import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { ChatToolsService } from './chat-tools.service.js';
import { ChatToolContext } from './tool-context.js';

/**
 * Function declarations — Gemini native function calling format.
 *
 * Description bang tieng Viet vi Gemini hieu tot, va target audience la VN →
 * help match intent chinh xac hon.
 */
export const chatToolDefinitions: FunctionDeclaration[] = [
  {
    name: 'search_products',
    description:
      'Tim san pham theo tu khoa (ten, mo ta). Dung khi khach hoi "co san pham X khong", "ban nao ... nao", "cho xem loai ..."',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Tu khoa tim kiem, vi du "ao thun nam", "giay the thao"',
        },
        limit: {
          type: SchemaType.NUMBER,
          description: 'So san pham toi da muon lay (mac dinh 5, toi da 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product_by_id',
    description:
      'Lay chi tiet 1 san pham cu the theo ID. Chi dung khi da biet ID tu search_products.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: 'ID (ULID) cua san pham',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'search_orders',
    description:
      'Tra don hang. QUAN TRONG: chi goi khi khach da dang nhap (CUSTOMER/AGENT/ADMIN). Neu khach la GUEST, khong goi tool nay — yeu cau dang nhap. Voi CUSTOMER, tool tu dong chi tra don cua chinh khach — khong can keyword, truyen order number neu khach co cung cap.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keyword: {
          type: SchemaType.STRING,
          description:
            'Ma don hang (neu khach cung cap). CUSTOMER: optional; AGENT/ADMIN: email, sdt, hoac ma don.',
        },
        limit: {
          type: SchemaType.NUMBER,
          description: 'So don toi da (mac dinh 5)',
        },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'get_order_details',
    description:
      'Lay chi tiet don hang kem items. CUSTOMER chi lay duoc don cua chinh minh.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        orderIdOrNumber: {
          type: SchemaType.STRING,
          description: 'ID (ULID) hoac order_number',
        },
      },
      required: ['orderIdOrNumber'],
    },
  },
  {
    name: 'search_faq',
    description:
      'Tim cau hoi thuong gap (FAQ). Dung khi khach hoi ve chinh sach, huong dan, thac mac chung.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Tu khoa hoac cau hoi',
        },
        limit: {
          type: SchemaType.NUMBER,
          description: 'So FAQ toi da (mac dinh 3)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_promotions',
    description:
      'Lay danh sach khuyen mai dang active. Dung khi khach hoi "co khuyen mai gi khong", "ma giam gia", "sale".',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_shipping_policy',
    description:
      'Lay chinh sach giao hang / doi tra. Dung khi khach hoi "phi ship bao nhieu", "bao lau nhan duoc", "doi tra the nao".',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

/**
 * Dispatch function call tu AI → ChatToolsService method tuong ung,
 * FORWARD ChatToolContext de enforce permission/audit/rate-limit.
 *
 * Neu loi permission/input/rate → tools da return `{ error }` (qua audit wrapper),
 * chi "unknown function" la return error o day.
 */
export async function executeFunctionCall(
  name: string,
  args: Record<string, any>,
  toolsService: ChatToolsService,
  ctx: ChatToolContext,
): Promise<unknown> {
  switch (name) {
    case 'search_products':
      return toolsService.searchProducts(args.query, args.limit, ctx);
    case 'get_product_by_id':
      return toolsService.getProductById(args.id, ctx);
    case 'search_orders':
      return toolsService.searchOrders(args.keyword, args.limit, ctx);
    case 'get_order_details':
      return toolsService.getOrderById(
        args.orderIdOrNumber,
        args.customerIdentifier,
        ctx,
      );
    case 'search_faq':
      return toolsService.searchFaq(args.query, args.limit, ctx);
    case 'get_promotions':
      return toolsService.getPromotions(ctx);
    case 'get_shipping_policy':
      return toolsService.getShippingPolicy(ctx);
    default:
      return { error: `Unknown function: ${name}` };
  }
}
