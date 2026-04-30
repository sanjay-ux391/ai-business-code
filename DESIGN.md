# AI Business Autopilot — Design Brief

## Purpose & Context
Professional SaaS platform for local businesses acting as 24/7 AI receptionist. Balances trustworthy dashboard (lead/appointment management) with familiar WhatsApp-style chat interface. Primary user: small business owners managing incoming customer inquiries.

## Tone & Aesthetic
**Professional + Modern SaaS** (Intercom/Zoho SalesIQ precedent). Clean geometric hierarchy, minimal decoration, high information density. Bold indigo brand color pairs with WhatsApp green accent for familiar chat UX. Zero generic defaults — intentional color, typography, and spacing choices throughout.

## Differentiation
WhatsApp-familiar chat aesthetic merged seamlessly with professional SaaS dashboard. Chat bubbles use light green backgrounds for AI responses, white for user messages, deep indigo for CTAs. Dashboard sidebar in clean white with indigo active states creates visual separation between "conversational" and "administrative" zones.

## Color Palette

| Token | Light OKLCH | Dark OKLCH | Purpose |
|-------|-------------|-----------|---------|
| **Primary (Indigo)** | `0.38 0.18 283` | `0.72 0.20 283` | Brand identity, CTAs, sidebar active states, form focus rings |
| **Accent (Green)** | `0.54 0.24 142` | `0.68 0.22 142` | Chat send button, success states, green message bubbles |
| **Accent Light** | `0.84 0.12 142` | `0.42 0.15 142` | AI message bubble backgrounds, subtle green highlights |
| **Foreground** | `0.16 0 0` | `0.94 0 0` | Primary text, maximum contrast on backgrounds |
| **Card** | `1.0 0 0` | `0.16 0 0` | Message bubbles, input fields, elevated surface |
| **Muted** | `0.93 0 0` | `0.20 0 0` | Placeholder text, disabled states, secondary info |
| **Border** | `0.88 0 0` | `0.26 0 0` | Dividers, card edges, form borders |
| **Destructive** | `0.55 0.22 25` | `0.65 0.19 22` | Delete/error states, alerts |

## Typography

| Tier | Font | Usage | Weight | Size |
|------|------|-------|--------|------|
| **Display** | Bricolage Grotesque | Hero headlines, page titles, bold messaging | 600–700 | 32px, 48px |
| **Body** | General Sans | Paragraphs, labels, UI copy | 400–600 | 14px, 16px |
| **Mono** | Geist Mono | Code, timestamps, API details | 400 | 12px, 13px |

**Strategy:** Geometric display font (Bricolage) signals modern tech. General Sans provides professional readability for content. Mono reserved for technical contexts (timestamps in chat, configuration code). All fonts loaded via @font-face with `font-display: swap` for performance.

## Elevation & Depth

| Level | Shadow Token | Usage |
|-------|--------------|-------|
| **Surface 0** | None | Flat backgrounds (sidebar, page background) |
| **Surface 1** | `shadow-subtle` (2px/0.04 opacity) | Subtle lift: chat bubbles, input fields, list items on hover |
| **Surface 2** | `shadow-elevated` (8px/0.08 opacity) | Cards, modals, popovers, floating action buttons |
| **Surface 3** | `shadow-elevated-lg` (16px/0.12 opacity) | Dropdowns, tooltips, elevated overlays |

Shadows use foreground color with controlled opacity rather than default grey. Creates depth without darkening content.

## Structural Zones

| Zone | Treatment | Spacing | Border | Purpose |
|------|-----------|---------|--------|---------|
| **Header** | `bg-card` with `border-b` | 16px padding, 12px content gap | `1px border-border` | Global nav, branding, top-level actions |
| **Sidebar** | `bg-sidebar` (white/dark) | 8px item padding, 24px section gap | `border-r` | Navigation, secondary actions, focus visual |
| **Main Content** | `bg-background` with `bg-card` sections | 24px outer, 16px inner | None; card borders only | Primary work area, messaging, forms |
| **Chat Panel** | `bg-card` with `bg-accent-light` bubbles | 12px bubble margin, 16px input margin | None; bubble radii | Message display, input area |
| **Footer** | `bg-muted/20` with `border-t` | 16px padding | `1px border-border` | Secondary actions, metadata, legal |

## Spacing & Rhythm

- **Micro (4px):** Icon padding, tight grouping
- **Small (8px):** Bubble margins, label-input gaps
- **Medium (16px):** Card padding, section dividers
- **Large (24px):** Page margins, major section breaks
- **XL (32px+):** Hero sections, landing page layout

Establishes visual breathing room. Sidebar and dashboard use consistent 16px–24px padding. Chat bubbles use 12px margin for conversation flow.

## Component Patterns

| Pattern | Details |
|---------|---------|
| **Buttons** | Primary (indigo bg, white text), Secondary (border + indigo text), Danger (red bg), Ghost (text-only). Min 44px height for touch. |
| **Chat Bubbles** | AI: light green `bg-[oklch(var(--whatsapp-green-light))]`, user: indigo `bg-primary`. Rounded corners (24px radius). Timestamp below each. |
| **Input Fields** | `bg-card`, `border-border`, indigo focus ring. Clear placeholder text (muted). Icon support on left/right. |
| **Data Tables** | Striped rows (`bg-muted/30` alternating), minimal borders, sortable headers. Action buttons on hover. |
| **Metric Cards** | `bg-card` with `shadow-subtle`, large metric number in primary color, secondary label below, icon in corner. |

## Motion & Interaction

| Animation | Keyframes | Duration | Usage |
|-----------|-----------|----------|-------|
| **Fade In** | 0% opacity → 100% | 0.2s ease-out | Page transitions, new messages, modals |
| **Slide Up** | translateY(8px) + opacity → 0 | 0.3s cubic-bezier(0.4, 0, 0.2, 1) | Chat bubbles, form submissions, toasts |
| **Typing Indicator** | 3 dots pulsing with 1.2s cycle | 0.2s stagger | AI is composing message |
| **Smooth Transition** | All properties | 0.3s cubic-bezier(0.4, 0, 0.2, 1) | Hover states, button interactions, focus rings |

All motion uses easing curve `cubic-bezier(0.4, 0, 0.2, 1)` for cohesive feel. No bounce or spring — professional restraint.

## Light & Dark Mode

**Light (default):** Clean white cards on light grey background. Indigo primary with full saturation. Green accent vibrant for chat. Sidebar white with subtle borders. Maximum contrast for readability during daylight.

**Dark:** Deep charcoal background (`0.13 OKLCH`), slightly lighter cards (`0.16`). Primary indigo brightened (`0.72`), accent green adjusted for legibility. Sidebar dark grey with lower contrast borders. Optimized for evening/night use without eye strain.

Both modes maintain AA+ contrast for all text-on-background and text-on-interactive combinations.

## Constraints & Anti-patterns

**Prohibited:** No purple gradients on every element; no safe blue `#3B82F6`; no uniform `rounded-lg` everywhere; no scatter animations without choreography; no rainbow palettes; no full-page gradient backgrounds.

**Required:** All colors via CSS variables in OKLCH format; all fonts from bundled list; shadow hierarchy respected; consistent spacing scale; semantic token usage in components; light/dark mode applied intentionally.

## Signature Detail

**WhatsApp-inspired chat bubbles with professional dashboard frame.** AI response bubbles use signature light green (`0.84 0.12 142` light / `0.42 0.15 142` dark) with rounded corners — instantly familiar to users. Paired with deep indigo sidebar and professional metric cards, creates memorable blend of conversational UX and administrative power. This signature detail appears nowhere else in the UI — reserved for the chat zone alone.

## Landing Page Direction

**Hero gradient background** using primary indigo fading to deeper blue-purple (`oklch(0.42 0.22 283)` → `oklch(0.48 0.18 315)`). Headline in Bricolage Grotesque (48px, 700 weight) with white text. CTA button in accent green with rounded corners. Below hero: 3-card feature section (each card with `shadow-subtle`, indigo accent icon), pricing table with indigo primary plan highlight, testimonial carousel with user photos.

## Resources

- Color tokens and OKLCH values: `src/frontend/src/index.css` (`:root` and `.dark` blocks)
- Font declarations: `src/frontend/src/index.css` (@font-face rules)
- Tailwind extensions: `src/frontend/tailwind.config.js` (boxShadow, keyframes, animation)
- Fonts directory: `src/frontend/public/assets/fonts/` (Bricolage Grotesque, General Sans, Geist Mono)
- Design preview: `.platform/design/preview-1775745350761.jpg`
