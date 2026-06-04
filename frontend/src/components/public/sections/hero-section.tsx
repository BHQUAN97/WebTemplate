'use client'

import { motion, useReducedMotion, type Variants, type TargetAndTransition } from 'framer-motion'
import Link from 'next/link'
import { ArrowDown, Star, Shield, Phone } from 'lucide-react'
import { siteConfig } from '@/config/site.config'

// ─── Animation Variants ───────────────────────────────────────────────────────

/** Cubic-bezier ease cho animations — satisfies BezierDefinition (readonly 4-tuple) */
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
}

const fadeRight: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
}

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: EASE_OUT_EXPO },
  },
}

const floatAnimation: TargetAndTransition = {
  y: [-8, 8, -8],
  transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Badge pill glassmorphism ở trên cùng */
function TrustBadge() {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md"
    >
      <span>🏆</span>
      <span>Được tin dùng bởi 500+ doanh nghiệp</span>
    </motion.div>
  )
}

/** Heading 3 dòng với gradient dòng giữa */
function HeroHeading() {
  // Tách tagline thành nhiều phần để tô màu khác nhau
  const nameParts = siteConfig.name
  const taglineParts = siteConfig.tagline

  return (
    <motion.h1
      variants={fadeRight}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.1 }}
      className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-7xl"
    >
      {/* Dòng 1: tên thương hiệu — text thường */}
      <span className="block text-white">{nameParts}</span>

      {/* Dòng 2: tagline — gradient text */}
      <span
        className="block bg-clip-text text-transparent"
        style={{
          backgroundImage: `linear-gradient(135deg, ${siteConfig.theme.primary} 0%, ${siteConfig.theme.accent} 100%)`,
        }}
      >
        {taglineParts}
      </span>

      {/* Dòng 3: call-to-action text — text thường */}
      <span className="block text-white/90">Cho doanh nghiệp bạn.</span>
    </motion.h1>
  )
}

/** Mô tả phụ dưới heading */
function HeroSubtext() {
  return (
    <motion.p
      variants={fadeRight}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.2 }}
      className="max-w-lg text-lg leading-relaxed text-gray-300"
    >
      {siteConfig.description} Tối ưu vận hành, tăng trưởng doanh thu — ngay từ ngày đầu tiên.
    </motion.p>
  )
}

/** 2 nút CTA */
function HeroButtons() {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.3 }}
      className="flex flex-wrap gap-4"
    >
      {/* Primary — gradient bg */}
      <Link
        href="/contact"
        className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${siteConfig.theme.primary} 0%, ${siteConfig.theme.accent} 100%)`,
          boxShadow: `0 8px 32px ${siteConfig.theme.primary}55`,
        }}
      >
        <Phone className="size-4" />
        Tư vấn miễn phí
      </Link>

      {/* Secondary — glassmorphism */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/10 active:bg-white/15"
      >
        Khám phá ngay
        <ArrowDown className="size-4 -rotate-90" />
      </Link>
    </motion.div>
  )
}

/** 3 trust chips inline */
function TrustChips() {
  const chips = [
    { icon: <Star className="size-3.5 fill-yellow-400 text-yellow-400" />, label: '5.0 Reviews' },
    { icon: <Shield className="size-3.5 text-emerald-400" />, label: 'Bảo hành 12 tháng' },
    { icon: <span className="text-emerald-400 text-xs font-bold">✓</span>, label: 'Miễn phí tư vấn' },
  ]

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.4 }}
      className="flex flex-wrap items-center gap-4"
    >
      {chips.map((chip, i) => (
        <div key={i} className="flex items-center gap-1.5 text-sm text-gray-400">
          {chip.icon}
          <span>{chip.label}</span>
          {i < chips.length - 1 && (
            <span className="ml-2 text-gray-600 select-none">|</span>
          )}
        </div>
      ))}
    </motion.div>
  )
}

/** Stats card glassmorphism bên phải */
function StatsCard() {
  const stats = [
    { value: '500+', label: 'Doanh nghiệp tin dùng' },
    { value: '10+', label: 'Năm kinh nghiệm' },
    { value: '98%', label: 'Khách hàng hài lòng' },
  ]

  return (
    <motion.div
      variants={fadeLeft}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.4 }}
      className="relative w-full max-w-sm"
    >
      {/* Float animation wrapper */}
      <motion.div animate={floatAnimation}>
        {/* Card glassmorphism */}
        <div
          className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl"
          style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}
        >
          {/* Gradient overlay bên trong card */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${siteConfig.theme.primary}40, transparent 60%)`,
            }}
          />

          {/* Header card */}
          <p className="mb-6 text-sm font-medium uppercase tracking-widest text-white/50">
            Thành tích nổi bật
          </p>

          {/* Stats list */}
          <div className="relative z-10 space-y-6">
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{stat.label}</span>
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{
                    background: `linear-gradient(135deg, #ffffff 0%, ${siteConfig.theme.accent} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Separator decorative */}
          <div
            className="my-6 h-px w-full opacity-20"
            style={{ background: `linear-gradient(90deg, transparent, ${siteConfig.theme.primary}, transparent)` }}
          />

          {/* CTA mini trong card */}
          <Link
            href="/contact"
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{
              background: `linear-gradient(135deg, ${siteConfig.theme.primary}80, ${siteConfig.theme.accent}80)`,
            }}
          >
            Liên hệ ngay hôm nay
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Scroll indicator ở bottom */
function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2"
    >
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
      >
        <span className="text-xs uppercase tracking-widest">Cuộn xuống</span>
        <ArrowDown className="size-4" />
      </motion.div>
    </motion.div>
  )
}

// ─── Mesh Gradient Background ─────────────────────────────────────────────────

/**
 * Background với animated mesh gradient tạo hiệu ứng chiều sâu.
 * Dùng multiple radial gradients + CSS keyframe animation qua inline style.
 */
function MeshBackground() {
  return (
    <>
      {/* Base background color từ siteConfig.theme.secondary */}
      <div className="absolute inset-0" style={{ backgroundColor: siteConfig.theme.secondary }} />

      {/* Mesh gradient layer 1 — animated blob */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, ${siteConfig.theme.primary}33 0%, transparent 70%),
            radial-gradient(ellipse 60% 80% at 80% 20%, ${siteConfig.theme.accent}22 0%, transparent 60%),
            radial-gradient(ellipse 100% 60% at 50% 80%, #7c3aed22 0%, transparent 70%)
          `,
          animation: 'meshShift 12s ease-in-out infinite alternate',
        }}
      />

      {/* Blob decor 1 — top-right */}
      <div
        className="absolute -right-32 -top-32 size-[600px] rounded-full opacity-20 blur-3xl"
        style={{
          backgroundColor: siteConfig.theme.primary,
          animation: 'blobPulse1 8s ease-in-out infinite',
        }}
      />

      {/* Blob decor 2 — bottom-left */}
      <div
        className="absolute -bottom-48 -left-24 size-[500px] rounded-full opacity-15 blur-3xl"
        style={{
          backgroundColor: siteConfig.theme.accent,
          animation: 'blobPulse2 10s ease-in-out infinite',
        }}
      />

      {/* Blob decor 3 — center-right subtle */}
      <div
        className="absolute right-1/4 top-1/2 size-[300px] rounded-full opacity-10 blur-3xl"
        style={{
          backgroundColor: '#7c3aed',
          animation: 'blobPulse3 14s ease-in-out infinite',
        }}
      />

      {/* Noise texture overlay cho chiều sâu */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* Keyframe styles — inject vào DOM */}
      <style>{`
        @keyframes meshShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes blobPulse1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(-40px, 30px) scale(1.1); }
          66%       { transform: translate(20px, -20px) scale(0.95); }
        }
        @keyframes blobPulse2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40%       { transform: translate(50px, -40px) scale(1.15); }
          70%       { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blobPulse3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-30px, 30px) scale(1.2); }
        }
      `}</style>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * HeroSection — Landing page hero cho doanh nghiệp.
 * Layout: 2 cột desktop (text | stats card), 1 cột mobile.
 * Background: animated mesh gradient trên nền tối siteConfig.theme.secondary.
 */
export function HeroSection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section
      className="relative min-h-screen overflow-hidden"
      aria-label="Hero section"
    >
      {/* ── Animated background ── */}
      <MeshBackground />

      {/* ── Grid layout ── */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 py-24 lg:px-12">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* ── Left: Text content ── */}
          <div className="flex flex-col gap-6 lg:gap-8">
            {/* Badge */}
            <TrustBadge />

            {/* H1 */}
            <HeroHeading />

            {/* Mô tả */}
            <HeroSubtext />

            {/* Buttons */}
            <HeroButtons />

            {/* Trust chips */}
            <TrustChips />
          </div>

          {/* ── Right: Stats card ── */}
          <div className="flex justify-center lg:justify-end">
            <StatsCard />
          </div>
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      {!prefersReducedMotion && <ScrollIndicator />}

      {/* ── Bottom fade vignette — chuyển tiếp sang section tiếp theo ── */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: `linear-gradient(to bottom, transparent, ${siteConfig.theme.secondary})`,
        }}
      />
    </section>
  )
}
