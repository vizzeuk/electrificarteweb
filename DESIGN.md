# Design System: Electrificarte Homepage Redesign
**Project ID:** 1523707350124800741
**Stitch Source:** [Electrificarte Homepage Redesign](https://stitch.withgoogle.com/projects/1523707350124800741)

## 1. Visual Theme & Atmosphere

Premium, minimal, and kinetic. The design channels an Apple-meets-automotive editorial aesthetic: generous whitespace, high-contrast hero photography with cinematic gradients, and a single electric-cyan accent that pulses through every interactive element. Dark sections (hero, hot deal, footer) create dramatic contrast against crisp white content areas. The overall feel is confident, modern, and data-driven — showcasing vehicles as aspirational objects while keeping the UI functionally clean.

**Density:** Spacious — sections breathe with `py-24` (~96px) vertical rhythm.
**Motion philosophy:** Subtle, purposeful — hover scale transforms on images, smooth color transitions on buttons, backdrop-blur on glass surfaces.

## 2. Color Palette & Roles

### Primary Accent
- **Electric Cyan** (`#00E5E5`) — Primary brand accent. Used for CTAs, highlights, badges, price callouts, and interactive hover states.
- **Deep Cyan** (`#00C2C2`) — Hover/active state of primary. Used for pressed buttons and secondary emphasis.
- **Teal Foundation** (`#006A61`) — Used sparingly for text links and deep contrast against light surfaces.
- **Cyan Glow Container** (`#00E5D1`) — Softer teal for badge backgrounds, tag pills, and container highlights.

### Neutrals
- **Pure White** (`#FFFFFF`) — Primary background for content sections and cards.
- **Snow Surface** (`#F9FAFB` / `#F8F9FC`) — Section alternate background (latest launches, FAQ, features).
- **Whisper Border** (`#E5E7EB`) — Card borders and dividers at rest.
- **Fog Gray** (`#F3F4F6`) — Module labels, input backgrounds, subtle fills.

### Text
- **Ink Black** (`#111827` / `#191C1E`) — Primary headings and body text.
- **Slate Muted** (`#4B5563`) — Secondary text, descriptions, data labels.
- **Ghost Gray** (`#9CA3AF`) — Placeholder text, disabled states, module annotations.

### Contextual
- **Obsidian Black** (`#000000`) — Hero overlay, hot deal section, footer background.
- **White with opacity** (`white/10`, `white/20`, `white/60`, `white/80`) — Layered text and glassmorphism elements on dark backgrounds.
- **Error Red** (`#BA1A1A`) — Form validation errors.
- **Amber Tertiary** (`#7C5800` / `#FFC349`) — Reserved for urgency badges ("HOT DEAL"), countdown timers.

## 3. Typography Rules

### Font Families
- **Headlines:** `Space Grotesk` — Bold, geometric, tracks tight. Used for all section titles, hero headlines, navbar brand, and CTAs. Weights: 500 (medium), 600 (semibold), 700 (bold).
- **Body & Labels:** `Inter` — Clean sans-serif for readability. Used for descriptions, form labels, data values, and navigation links. Weights: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold).
- **Icons:** `Material Symbols Outlined` — Variable weight (100-700), used throughout for UI iconography.

### Scale & Behavior
- **Hero headline:** `text-5xl` to `text-7xl` (3rem-4.5rem), `font-extrabold`, `leading-[1.1]`.
- **Section headers:** `text-3xl` to `text-4xl` (1.875rem-2.25rem), `font-black`, `uppercase`, `tracking-tight`.
- **Card titles:** `text-xl` (1.25rem), `font-bold`.
- **Data labels:** `0.7rem`, `uppercase`, `letter-spacing: 0.05em`, `font-weight: 600`, muted color.
- **Body text:** `text-sm` to `text-lg` (0.875rem-1.125rem).
- **Micro text:** `text-[10px]` to `text-xs`, `uppercase`, `tracking-widest`.

## 4. Component Stylings

### Buttons
- **Primary CTA:** `bg-[#00E5E5]` text black, `font-bold`, `px-10 py-5`, `rounded-xl` (12px). Hover darkens to `#00C2C2`.
- **Secondary CTA:** `bg-gray-100` hover to `bg-[#00E5E5]`, `py-3`, `rounded-lg` (8px).
- **Card Action:** `bg-[#00E5E5]`, `py-2`, `rounded-lg`, `uppercase tracking-widest text-xs`. Hover inverts to `bg-black text-white`.
- **Pill Button (WhatsApp):** `bg-black text-white`, `rounded-full`, `px-6 py-2.5`.
- **Form Submit:** `rounded-full`, `py-5`, full-width, cyan glow on hover.

### Cards / Containers
- **Vehicle Card (PLP):** `rounded-2xl` (16px), white bg, `border 1px solid #E5E7EB`. Hover border shifts to cyan. Image `aspect-[16/10]`.
- **Opportunity Card:** `rounded-xl` (12px), compact, image `aspect-[4/3]`.
- **Category Banner:** `rounded-3xl` (24px), `bg-gray-50`, `p-10`, image scales 110% on hover.
- **Glass Card (Hero):** `bg-white/10`, `backdrop-blur-md`, `border border-white/20`, `rounded-xl`.

### Inputs / Forms
- **Input fields:** `bg-[#E7E8EB]`, no visible border, `border-b-2` reveals cyan on focus. `rounded-lg`, `py-3 px-4`.
- **Labels:** `text-xs`, `font-bold`, `uppercase`, `tracking-wider`, muted color.

### Navigation
- **Navbar:** `sticky top-0 z-50`, `bg-white/90 backdrop-blur-md`, `border-b border-gray-100`, height 80px.
- **Nav links:** `text-sm font-medium`, hover to cyan.

### Footer
- **Background:** `bg-black`, white text. 4-column grid. Brand bolt icon gets cyan bg.

## 5. Layout Principles

- **Max width:** `max-w-7xl` (1280px).
- **Horizontal padding:** `px-4` (mobile) to `px-8` (desktop).
- **Section rhythm:** `py-24` (96px) vertical padding.
- **Grid gaps:** `gap-6` (compact), `gap-8` (standard), `gap-12` (spacious).
- **Responsive:** 1-col mobile, 2-col tablet, 3-4 col desktop.
- **Effects:** Hero gradient `from-black/90 via-black/40 to-transparent`, glassmorphism navbar, cyan glow CTAs, blurred ambient orbs.
