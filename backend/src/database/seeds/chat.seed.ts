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
    response: 'Xin chao! Em co the ho tro gi cho anh/chi? 🛍️',
    priority: 100,
  },
  {
    name: 'greeting-keyword',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'chào|hi|hello|hey|xin chào',
    response: 'Chao anh/chi! Em co the giup gi hom nay?',
    priority: 80,
  },
  {
    name: 'pricing-question',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'giá|bao nhiêu|giá cả|price',
    response: JSON.stringify({
      text: 'Anh/chi quan tam den san pham nao? Em se bao gia ngay.',
      quickReplies: [
        { label: 'Thoi trang nam', value: 'category:fashion-men' },
        { label: 'Thoi trang nu', value: 'category:fashion-women' },
        { label: 'Phu kien', value: 'category:accessories' },
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
      'Shop free ship don tu 500k noi thanh HCM/HN. Cac tinh khac 30-50k tuy khu vuc. Giao 2-5 ngay lam viec.',
    priority: 90,
  },
  {
    name: 'payment-question',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'thanh toán|cod|chuyển khoản|momo|vnpay|stripe',
    response:
      'Shop ho tro: COD khi nhan hang, chuyen khoan ngan hang, Momo, VNPay, the quoc te qua Stripe.',
    priority: 90,
  },
  {
    name: 'return-policy',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'đổi trả|hoàn tiền|refund|return',
    response:
      'Shop ho tro doi tra trong 7 ngay neu loi tu nha san xuat. Phi ship 2 chieu shop chiu.',
    priority: 90,
  },
  {
    name: 'order-status',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'đơn hàng|theo dõi|tracking|order',
    response: JSON.stringify({
      text: 'Anh/chi cho em xin ma don hoac email/SDT dat hang de em kiem tra giup a.',
      quickReplies: [{ label: 'Nhap ma don', value: 'action:enter-order-id' }],
    }),
    responseType: MessageType.QUICK_REPLIES,
    priority: 100,
  },
  {
    name: 'thanks',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'cảm ơn|thanks|thank you|tks|ok',
    response: 'Da, em cam on anh/chi! Can ho tro gi them nhan em nhe 🌸',
    priority: 70,
  },
  {
    name: 'bye',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'bye|tạm biệt|goodbye|chào nhé',
    response: 'Em chao anh/chi! Hen gap lai a.',
    priority: 70,
  },
  {
    name: 'complaint',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'khiếu nại|phàn nàn|kém|tệ|dỏm|hỏng|lỗi',
    // Handoff sang HUMAN — chat.service se doc conditions.handoff de chuyen mode
    response:
      'Em xin loi vi trai nghiem chua tot. Anh/chi cho em ma don/san pham cu the, em chuyen bo phan CSKH giai quyet ngay a.',
    priority: 110,
    conditions: { handoff: 'HUMAN' },
  },
  {
    name: 'human-request',
    triggerType: ScenarioTrigger.KEYWORD,
    triggerValue: 'nhân viên|người thật|gặp người|human|agent',
    // Set mode=WAITING_AGENT — chat.service doc conditions.setMode
    response:
      'Em dang chuyen cho nhan vien truc. Vui long cho 1-2 phut a 🙏',
    priority: 120,
    conditions: { setMode: 'WAITING_AGENT' },
  },
  {
    name: 'out-of-hours',
    triggerType: ScenarioTrigger.EVENT,
    triggerValue: 'conversation:out-of-hours',
    response:
      'Shop dang ngoai gio lam viec (9h-21h). Em ghi nhan, nhan vien se phan hoi vao sang mai nhe!',
    priority: 100,
  },
  {
    name: 'morning-greeting-scheduled',
    triggerType: ScenarioTrigger.SCHEDULED,
    triggerValue: '0 9 * * *',
    response:
      'Chao buoi sang! Cau hoi hom qua cua anh/chi da duoc giai dap chua a?',
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
      'Shop dang ngoai gio truc. AI se ho tro co ban, nhan vien phan hoi trong gio lam viec.',
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
