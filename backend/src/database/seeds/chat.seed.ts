import { DataSource } from 'typeorm';
import { ChatScenario } from '../../modules/chat/entities/chat-scenario.entity.js';
import { ChatSchedule } from '../../modules/chat/entities/chat-schedule.entity.js';
import {
  MessageType,
  ScenarioTrigger,
  ScheduleMode,
} from '../../modules/chat/chat.constants.js';
import { generateUlid } from '../../common/utils/ulid.js';

/**
 * Definition cho 1 scenario seed — rut gon so voi entity day du.
 * delayMinutes default 0, isActive default true, conditions default {}.
 */
interface ScenarioSeed {
  name: string;
  triggerType: ScenarioTrigger;
  triggerValue: string;
  response: string;
  responseType?: MessageType;
  priority: number;
  conditions?: Record<string, any>;
  delayMinutes?: number;
}

/**
 * Danh sach 13 scenario mau — 12 keyword/event + 1 scheduled.
 * Text tieng Viet, phuc vu e-commerce (pricing, shipping, payment, return, order, complaint...).
 */
const SCENARIO_SEEDS: ScenarioSeed[] = [
  {
    name: 'welcome-new-conversation',
    triggerType: ScenarioTrigger.EVENT,
    triggerValue: 'conversation:started',
    response: 'Xin chào! Shop có thể hỗ trợ gì cho bạn? 🛍️',
    priority: 100,
  },
  {
    name: 'greeting-keyword',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'chào|hi|hello|hey|xin chào',
    response: 'Chào bạn! Shop có thể giúp gì hôm nay?',
    priority: 80,
  },
  {
    name: 'pricing-question',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'giá|bao nhiêu|giá cả|price',
    response: JSON.stringify({
      text: 'Bạn quan tâm đến sản phẩm nào? Shop sẽ báo giá ngay.',
      quickReplies: [
        { label: 'Thời trang nam', value: 'category:fashion-men' },
        { label: 'Thời trang nữ', value: 'category:fashion-women' },
        { label: 'Phụ kiện', value: 'category:accessories' },
      ],
    }),
    responseType: MessageType.QUICK_REPLIES,
    priority: 90,
  },
  {
    name: 'shipping-question',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'ship|giao hàng|vận chuyển|phí ship|free ship',
    response:
      'Shop free ship đơn từ 500k nội thành HCM/HN. Các tỉnh khác 30-50k tuỳ khu vực. Giao 2-5 ngày làm việc.',
    priority: 90,
  },
  {
    name: 'payment-question',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'thanh toán|cod|chuyển khoản|momo|vnpay|stripe',
    response:
      'Shop hỗ trợ: COD khi nhận hàng, chuyển khoản ngân hàng, Momo, VNPay, thẻ quốc tế qua Stripe.',
    priority: 90,
  },
  {
    name: 'return-policy',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'đổi trả|hoàn tiền|refund|return',
    response:
      'Shop hỗ trợ đổi trả trong 7 ngày nếu lỗi từ nhà sản xuất. Phí ship 2 chiều shop chịu.',
    priority: 90,
  },
  {
    name: 'order-status',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'đơn hàng|theo dõi|tracking|order',
    response: JSON.stringify({
      text: 'Bạn cho shop xin mã đơn hoặc email/SĐT đặt hàng để shop kiểm tra giúp nhé.',
      quickReplies: [{ label: 'Nhập mã đơn', value: 'action:enter-order-id' }],
    }),
    responseType: MessageType.QUICK_REPLIES,
    priority: 100,
  },
  {
    name: 'thanks',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'cảm ơn|thanks|thank you|tks|ok',
    response: 'Dạ, shop cảm ơn bạn! Cần hỗ trợ gì thêm nhắn shop nhé 🌸',
    priority: 70,
  },
  {
    name: 'bye',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'bye|tạm biệt|goodbye|chào nhé',
    response: 'Shop chào bạn! Hẹn gặp lại ạ.',
    priority: 70,
  },
  {
    name: 'complaint',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'khiếu nại|phàn nàn|kém|tệ|dỏm|hỏng|lỗi',
    // Handoff sang HUMAN — chat.service se doc conditions.handoff de chuyen mode
    response:
      'Shop xin lỗi vì trải nghiệm chưa tốt. Bạn cho shop mã đơn/sản phẩm cụ thể, shop chuyển bộ phận CSKH giải quyết ngay ạ.',
    priority: 110,
    conditions: { handoff: 'HUMAN' },
  },
  {
    name: 'human-request',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'nhân viên|người thật|gặp người|human|agent',
    // Set mode=WAITING_AGENT — chat.service doc conditions.setMode
    response:
      'Shop đang chuyển cho nhân viên trực. Bạn vui lòng chờ 1-2 phút ạ 🙏',
    priority: 120,
    conditions: { setMode: 'WAITING_AGENT' },
  },
  {
    name: 'out-of-hours',
    triggerType: ScenarioTrigger.EVENT,
    triggerValue: 'conversation:out-of-hours',
    response:
      'Shop đang ngoài giờ làm việc (9h-21h). Shop ghi nhận, nhân viên sẽ phản hồi vào sáng mai nhé!',
    priority: 100,
  },
  {
    name: 'morning-greeting-scheduled',
    triggerType: ScenarioTrigger.SCHEDULED,
    triggerValue: '0 9 * * *',
    response:
      'Chào buổi sáng! Câu hỏi hôm qua của bạn đã được giải đáp chưa ạ?',
    priority: 50,
    // Chi ap dung cho conversation mo > 12h, mark metadata de khong lap
    conditions: {
      minOpenHours: 12,
      markMetadata: { morningGreetingSent: true },
      skipIfMetadata: 'morningGreetingSent',
    },
  },
];

/**
 * Definition cho 1 schedule seed.
 * timezone default Asia/Ho_Chi_Minh, isActive default true.
 */
interface ScheduleSeed {
  name: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  mode: ScheduleMode;
  priority: number;
  fallbackMessage?: string;
}

/**
 * 5 schedule mau — bao phu 24/7 voi priority de conflict duoc giai quyet.
 * Gio hanh chinh co priority cao nhat (100). Cuoi tuan override ngay thuong.
 */
const SCHEDULE_SEEDS: ScheduleSeed[] = [
  {
    name: 'Ca sang AI',
    dayOfWeek: null,
    startTime: '00:00',
    endTime: '09:00',
    mode: ScheduleMode.AI,
    priority: 50,
    fallbackMessage:
      'Shop đang ngoài giờ trực. Shop sẽ hỗ trợ cơ bản qua AI, nhân viên phản hồi trong giờ làm việc.',
  },
  {
    name: 'Gio hanh chinh (co nhan vien)',
    dayOfWeek: null,
    startTime: '09:00',
    endTime: '18:00',
    mode: ScheduleMode.HYBRID,
    priority: 100,
  },
  {
    name: 'Ca toi HYBRID',
    dayOfWeek: null,
    startTime: '18:00',
    endTime: '22:00',
    mode: ScheduleMode.HYBRID,
    priority: 80,
  },
  {
    name: 'Khuya (AI only)',
    dayOfWeek: null,
    startTime: '22:00',
    endTime: '23:59',
    mode: ScheduleMode.AI,
    priority: 70,
  },
  {
    name: 'Cuoi tuan - Chu nhat',
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '21:00',
    mode: ScheduleMode.AI,
    priority: 90,
  },
  {
    name: 'Cuoi tuan - Thu bay',
    dayOfWeek: 6,
    startTime: '09:00',
    endTime: '21:00',
    mode: ScheduleMode.AI,
    priority: 90,
  },
];

/**
 * Seed chat scenarios + schedules.
 * Idempotent: neu chat_scenarios da co record thi skip toan bo.
 * Goi tu master runner (chat-runner.ts) hoac direct integration test.
 */
export async function seedChat(dataSource: DataSource): Promise<void> {
  const scenarioRepo = dataSource.getRepository(ChatScenario);
  const scheduleRepo = dataSource.getRepository(ChatSchedule);

  const existingCount = await scenarioRepo.count();
  if (existingCount > 0) {
    console.log(
      `[chat.seed] Chat seed already exists (${existingCount} scenarios) — skipping`,
    );
    return;
  }

  // Insert scenarios
  const scenarios = SCENARIO_SEEDS.map((s) =>
    scenarioRepo.create({
      id: generateUlid(),
      name: s.name,
      triggerType: s.triggerType,
      triggerValue: s.triggerValue,
      response: s.response,
      responseType: s.responseType ?? MessageType.TEXT,
      priority: s.priority,
      conditions: s.conditions ?? {},
      delayMinutes: s.delayMinutes ?? 0,
      isActive: true,
      matchCount: 0,
      followUpScenarioId: null,
    }),
  );
  await scenarioRepo.save(scenarios);
  console.log(`[chat.seed] Seeded ${scenarios.length} scenarios`);

  // Insert schedules (chi seed neu chua co)
  const scheduleCount = await scheduleRepo.count();
  if (scheduleCount === 0) {
    const schedules = SCHEDULE_SEEDS.map((s) =>
      scheduleRepo.create({
        id: generateUlid(),
        name: s.name,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        mode: s.mode,
        priority: s.priority,
        fallbackMessage: s.fallbackMessage ?? null,
        timezone: 'Asia/Ho_Chi_Minh',
        isActive: true,
      }),
    );
    await scheduleRepo.save(schedules);
    console.log(`[chat.seed] Seeded ${schedules.length} schedules`);
  } else {
    console.log(
      `[chat.seed] ${scheduleCount} schedules already exist — skipping schedule seed`,
    );
  }
}
