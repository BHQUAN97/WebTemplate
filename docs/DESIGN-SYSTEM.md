# Design System — WebTemplate

Tham chieu nhanh cho design tokens, component inventory, va workflow rebrand.
Frontend dung Tailwind CSS 4 + Radix UI primitives. Tokens duoc expose qua
CSS variables trong `frontend/src/app/globals.css` va Tailwind auto-map sang
cac utility class (`bg-primary`, `text-foreground`, `border-border`, ...).

## Color tokens

Tat ca mau duoc khai bao trong `globals.css` duoi dang CSS variables HSL/OKLCH.
Dark mode override cung bo bien trong selector `.dark`.

| Token | Utility | Muc dich |
|---|---|---|
| `--background` | `bg-background` | Mau nen chinh cua trang |
| `--foreground` | `text-foreground` | Mau chu chinh |
| `--card` / `--card-foreground` | `bg-card`, `text-card-foreground` | Surface cho Card |
| `--popover` / `--popover-foreground` | `bg-popover`, `text-popover-foreground` | Dropdown, Popover, Tooltip |
| `--primary` / `--primary-foreground` | `bg-primary`, `text-primary-foreground` | Brand chinh, CTA |
| `--secondary` / `--secondary-foreground` | `bg-secondary`, `text-secondary-foreground` | Button secondary, subtle CTA |
| `--muted` / `--muted-foreground` | `bg-muted`, `text-muted-foreground` | Text phu, disabled, skeleton |
| `--accent` / `--accent-foreground` | `bg-accent`, `text-accent-foreground` | Hover state, highlight nhe |
| `--destructive` / `--destructive-foreground` | `bg-destructive`, `text-destructive-foreground` | Error, delete, nguy hiem |
| `--border` | `border-border` | Viền mac dinh |
| `--input` | `border-input` | Viền input |
| `--ring` | `ring-ring` | Focus ring |

## Spacing scale

Mac dinh Tailwind (`0`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `4`, `5`, `6`, `8`,
`10`, `12`, `16`, `20`, `24`). Base unit = `0.25rem` = 4px.

- Component padding: `p-3` -> `p-4` cho card, `px-4 py-2` cho button.
- Section gap: `gap-4` (list), `gap-6` (section), `gap-8` (page layout).
- Page container: `container mx-auto px-4` hoac `max-w-7xl mx-auto px-6`.

## Typography scale

| Utility | Size / line-height | Dung cho |
|---|---|---|
| `text-xs` | 12 / 16 | Meta, badge, caption |
| `text-sm` | 14 / 20 | Body secondary, form label |
| `text-base` | 16 / 24 | Body mac dinh |
| `text-lg` | 18 / 28 | Lead paragraph |
| `text-xl` | 20 / 28 | H4 |
| `text-2xl` | 24 / 32 | H3 |
| `text-3xl` | 30 / 36 | H2 |
| `text-4xl` | 36 / 40 | H1 |

Font stack: mac dinh Tailwind `font-sans`. Override qua CSS var `--font-sans`
trong `globals.css` neu can brand font.

## Radius tokens

| Token | Utility |
|---|---|
| `--radius-sm` | `rounded-sm` (2px) |
| `--radius` (base) | `rounded` / `rounded-md` (6px) |
| `--radius-lg` | `rounded-lg` (8-12px) |
| full | `rounded-full` (avatar, pill) |

## Shadow tokens

Mac dinh Tailwind: `shadow-xs`, `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`,
`shadow-xl`. Dung `shadow-sm` cho Card, `shadow-md` cho popover/dropdown,
`shadow-lg` cho modal.

## Dark mode strategy

- Class-based (`dark:` variant).
- Toggle via Zustand `themeStore` + set class `dark` tren `<html>`.
- System preference detection trong `ThemeProvider` (`prefers-color-scheme`).
- Tat ca token deu co dark counterpart — chi can dung utility `bg-primary`,
  `text-foreground`, KHONG hardcode `text-white` / `bg-slate-900`.

## Component inventory

Tat ca primitive wrap Radix UI trong `frontend/src/components/ui/`:

| Component | Radix package | File |
|---|---|---|
| Avatar | `@radix-ui/react-avatar` | `ui/avatar.tsx` |
| Checkbox | `@radix-ui/react-checkbox` | `ui/checkbox.tsx` |
| Dialog / Modal | `@radix-ui/react-dialog` | `ui/dialog.tsx` |
| Dropdown Menu | `@radix-ui/react-dropdown-menu` | `ui/dropdown-menu.tsx` |
| Label | `@radix-ui/react-label` | `ui/label.tsx` |
| Popover | `@radix-ui/react-popover` | `ui/popover.tsx` |
| Select | `@radix-ui/react-select` | `ui/select.tsx` |
| Separator | `@radix-ui/react-separator` | `ui/separator.tsx` |
| Slot | `@radix-ui/react-slot` | (polymorphic helper) |
| Switch | `@radix-ui/react-switch` | `ui/switch.tsx` |
| Tabs | `@radix-ui/react-tabs` | `ui/tabs.tsx` |
| Toast | `@radix-ui/react-toast` | `ui/toast.tsx` |
| Tooltip | `@radix-ui/react-tooltip` | `ui/tooltip.tsx` |
| Command palette | `cmdk` | `ui/command.tsx` |

Khac: `Button`, `Input`, `Textarea`, `Card`, `Badge`, `Table` — plain Tailwind
+ `class-variance-authority` cho variant, `tailwind-merge` cho class dedup.

## Rebrand workflow

Khi muon thay doi brand (mau, font, radius):

1. Sua `frontend/src/lib/config/brand.ts` — ten app, logo path, meta description.
2. Sua CSS variables trong `frontend/src/app/globals.css`:
   - Block `:root { ... }` cho light mode.
   - Block `.dark { ... }` cho dark mode.
3. Neu doi font: cap nhat `--font-sans` va import font trong `app/layout.tsx`
   (Next.js `next/font/google`).
4. Chay `npm --prefix frontend run dev` de verify, khong can sua component.

## References

- Tailwind v4: <https://tailwindcss.com/docs>
- Radix UI: <https://www.radix-ui.com/primitives>
- cva: <https://cva.style/docs>
