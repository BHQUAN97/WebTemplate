'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Phone, Mail, Clock, CheckCircle, Send } from 'lucide-react';
import { siteConfig } from '@/config/site.config';
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal';

// ─── Schema validation ────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(10, 'Nội dung phải có ít nhất 10 ký tự'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

// ─── Info card sub-component ──────────────────────────────────────────────────

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function InfoCard({ icon, label, children }: InfoCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white"
        style={{ backgroundColor: siteConfig.theme.primary }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <div className="text-sm font-medium text-gray-800 break-words">{children}</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * ContactSection — Section liên hệ cuối landing page.
 * Bố cục 2 cột: trái = thông tin + bản đồ, phải = form.
 * Không kết nối API — dùng setTimeout giả lập submit.
 */
export function ContactSection() {
  const { contact, theme } = siteConfig;

  // Scroll reveal cho từng cột
  const { ref: leftRef, isVisible: leftVisible } = useScrollReveal({ threshold: 0.1 });
  const { ref: rightRef, isVisible: rightVisible } = useScrollReveal({ threshold: 0.1 });

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  // Zalo href — chỉ giữ chữ số
  const zaloDigits = contact.zalo ? contact.zalo.replace(/\D/g, '') : '';
  const zaloHref = zaloDigits ? `https://zalo.me/${zaloDigits}` : '';

  // Giả lập gửi form
  const onSubmit = async (_data: ContactFormValues) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSuccess(true);
    reset();
  };

  return (
    <section id="lien-he" className="bg-gray-50 py-20" aria-label="Liên hệ với chúng tôi">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <span
            className="inline-block mb-3 px-4 py-1 rounded-full text-white text-xs font-semibold tracking-widest uppercase"
            style={{ backgroundColor: theme.primary }}
          >
            Liên hệ
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Liên hệ với chúng tôi
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn. Hãy để lại thông tin — đội ngũ
            sẽ phản hồi trong thời gian sớm nhất.
          </p>
        </div>

        {/* 2-column grid */}
        <div className="grid lg:grid-cols-2 gap-10 xl:gap-16 items-start">
          {/* ── Cột trái: thông tin liên hệ ── */}
          <div
            ref={leftRef as React.RefObject<HTMLDivElement>}
            className={`transition-all duration-700 delay-100 ${
              leftVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
          >
            {/* Info cards */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {/* Phone */}
              <InfoCard icon={<Phone className="w-5 h-5" />} label="Điện thoại">
                <a
                  href={`tel:${contact.phone}`}
                  className="hover:underline"
                  style={{ color: theme.primary }}
                >
                  {contact.phoneDisplay || contact.phone}
                </a>
              </InfoCard>

              {/* Email */}
              <InfoCard icon={<Mail className="w-5 h-5" />} label="Email">
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:underline"
                  style={{ color: theme.primary }}
                >
                  {contact.email}
                </a>
              </InfoCard>

              {/* Address */}
              <InfoCard icon={<MapPin className="w-5 h-5" />} label="Địa chỉ">
                {contact.address}
              </InfoCard>

              {/* Hours */}
              <InfoCard icon={<Clock className="w-5 h-5" />} label="Giờ làm việc">
                {contact.hours}
              </InfoCard>
            </div>

            {/* Nút Zalo — chỉ hiện nếu có số */}
            {zaloHref && (
              <a
                href={zaloHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-full text-white font-semibold text-base shadow-md hover:opacity-90 active:scale-95 transition-all duration-200 min-h-[44px] mb-6"
                style={{ backgroundColor: '#0068ff' }}
                aria-label="Nhắn Zalo ngay"
              >
                {/* Zalo icon — inline SVG (không có trong lucide) */}
                <span
                  className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-white font-bold"
                  style={{ color: '#0068ff', fontSize: '11px', lineHeight: 1 }}
                  aria-hidden="true"
                >
                  Z
                </span>
                Nhắn Zalo ngay
              </a>
            )}

            {/* Google Maps embed hoặc placeholder */}
            {contact.googleMapsEmbed ? (
              <iframe
                src={contact.googleMapsEmbed}
                title="Bản đồ vị trí"
                className="w-full h-48 rounded-xl border-0 shadow-sm"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                aria-label="Google Maps embed"
              />
            ) : (
              <div className="w-full h-48 rounded-xl bg-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 shadow-inner">
                <MapPin className="w-8 h-8 opacity-50" aria-hidden="true" />
                <span className="text-sm font-medium">Bản đồ sẽ hiển thị tại đây</span>
              </div>
            )}
          </div>

          {/* ── Cột phải: form liên hệ ── */}
          <div
            ref={rightRef as React.RefObject<HTMLDivElement>}
            className={`transition-all duration-700 delay-200 ${
              rightVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              {isSuccess ? (
                /* ── Trạng thái thành công ── */
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <CheckCircle
                    className="w-16 h-16"
                    style={{ color: '#16a34a' }}
                    aria-hidden="true"
                  />
                  <h3 className="text-xl font-bold text-gray-900">Gửi thành công!</h3>
                  <p className="text-gray-500 max-w-xs leading-relaxed">
                    Chúng tôi sẽ liên hệ lại với bạn trong vòng 24h. Cảm ơn bạn đã tin tưởng!
                  </p>
                  <button
                    onClick={() => setIsSuccess(false)}
                    className="mt-2 px-6 py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors duration-200 min-h-[44px]"
                  >
                    Gửi tin nhắn khác
                  </button>
                </div>
              ) : (
                /* ── Form ── */
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                  {/* Họ tên */}
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Họ tên <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Nguyễn Văn A"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors duration-200 outline-none focus:ring-2 ${
                        errors.name
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-gray-200 focus:border-transparent'
                      }`}
                      style={
                        !errors.name
                          ? ({ '--tw-ring-color': `${theme.primary}40` } as React.CSSProperties)
                          : undefined
                      }
                      {...register('name')}
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    />
                    {errors.name && (
                      <p id="contact-name-error" className="mt-1 text-xs text-red-500" role="alert">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email + Phone — cùng hàng trên sm+ */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    {/* Email */}
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                      >
                        Email <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        autoComplete="email"
                        placeholder="email@example.com"
                        className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors duration-200 outline-none focus:ring-2 ${
                          errors.email
                            ? 'border-red-400 focus:ring-red-200'
                            : 'border-gray-200 focus:border-transparent'
                        }`}
                        {...register('email')}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'contact-email-error' : undefined}
                      />
                      {errors.email && (
                        <p id="contact-email-error" className="mt-1 text-xs text-red-500" role="alert">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Số điện thoại */}
                    <div>
                      <label
                        htmlFor="contact-phone"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                      >
                        Số điện thoại
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="090 000 0000"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm transition-colors duration-200 outline-none focus:ring-2 focus:border-transparent"
                        {...register('phone')}
                      />
                    </div>
                  </div>

                  {/* Dịch vụ quan tâm */}
                  <div>
                    <label
                      htmlFor="contact-service"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Dịch vụ quan tâm
                    </label>
                    <select
                      id="contact-service"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm transition-colors duration-200 outline-none focus:ring-2 focus:border-transparent bg-white text-gray-700 appearance-none cursor-pointer"
                      {...register('service')}
                    >
                      <option value="">-- Chọn dịch vụ --</option>
                      <option value="tuvan">Tư vấn</option>
                      <option value="baogia">Báo giá</option>
                      <option value="hoptac">Hợp tác</option>
                      <option value="khac">Khác</option>
                    </select>
                  </div>

                  {/* Nội dung */}
                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Nội dung <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      placeholder="Mô tả ngắn về nhu cầu của bạn..."
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors duration-200 outline-none focus:ring-2 resize-none ${
                        errors.message
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-gray-200 focus:border-transparent'
                      }`}
                      {...register('message')}
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'contact-message-error' : undefined}
                    />
                    {errors.message && (
                      <p id="contact-message-error" className="mt-1 text-xs text-red-500" role="alert">
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full text-white font-semibold text-base shadow-md hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200 min-h-[44px]"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                    }}
                    aria-label={isSubmitting ? 'Đang gửi tin nhắn' : 'Gửi tin nhắn'}
                  >
                    {isSubmitting ? (
                      <>
                        {/* Spinner */}
                        <svg
                          className="animate-spin h-4 w-4 text-white flex-shrink-0"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        Gửi tin nhắn
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400 leading-relaxed">
                    Thông tin của bạn sẽ được bảo mật tuyệt đối.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
