# Design System

**Version:** 1.0
**Date:** 2026-03-17

---

## 1. Color Palette

### Primary & Gradient Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--gradient-start` | `#4a3eea` (Indigo) | `#818cf8` (Indigo 300) | Primary gradient start, buttons, active states |
| `--gradient-mid` | `#8b5cf6` (Violet) | `#a78bfa` (Violet 300) | Gradient midpoint, secondary accents |
| `--gradient-end` | `#06b6d4` (Cyan) | `#22d3ee` (Cyan 300) | Gradient end, info highlights |

### Theme Variables (CSS Custom Properties)

| Variable | Light | Dark | Purpose |
|----------|-------|------|---------|
| `--bg` | `#ffffff` | `#09090b` | Page background |
| `--bg-card` | `rgba(255,255,255,0.8)` | `rgba(24,24,27,0.8)` | Card backgrounds (glassmorphism) |
| `--bg-input` | `rgba(248,248,251,0.8)` | `rgba(39,39,42,0.8)` | Form input backgrounds |
| `--bg-elevated` | `rgba(255,255,255,0.95)` | `rgba(24,24,27,0.95)` | Elevated surfaces (dropdowns, popovers) |
| `--text` | `#09090b` | `#fafafa` | Primary text |
| `--text-muted` | `#52525b` | `#a1a1aa` | Secondary text, descriptions |
| `--text-subtle` | `#71717a` | `#71717a` | Tertiary text, placeholders, hints |
| `--border` | `rgba(228,228,241,0.8)` | `rgba(63,63,70,0.5)` | Default borders |
| `--border-hover` | `rgba(74,62,234,0.4)` | `rgba(99,102,241,0.4)` | Hover/focus border accent |
| `--ring` | `#818cf8` | `#818cf8` | Focus ring color |
| `--glass` | `rgba(255,255,255,0.7)` | `rgba(24,24,27,0.6)` | Glassmorphism base |
| `--glass-border` | `rgba(74,62,234,0.12)` | `rgba(99,102,241,0.12)` | Glass card border |

### Tailwind Theme Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#4a3eea` | Primary brand color |
| `--color-secondary` | `#8b5cf6` | Secondary / violet |
| `--color-success` | `#10b981` | Success states, positive indicators |
| `--color-warning` | `#f59e0b` | Warning states, caution indicators |
| `--color-destructive` | `#ef4444` | Error states, destructive actions |
| `--color-info` | `#06b6d4` | Informational states, cyan accent |

### Tier Colors (Opportunity Scoring)

| Tier | Background | Text | Border |
|------|-----------|------|--------|
| S | `violet-500/20` | `violet-400` | `violet-500/30` |
| A | `indigo-500/20` | `indigo-400` | `indigo-500/30` |
| B | `blue-500/20` | `blue-400` | `blue-500/30` |
| C | `amber-500/20` | `amber-400` | `amber-500/30` |
| D | `rose-500/20` | `rose-400` | `rose-500/30` |

---

## 2. Typography

### Font Families

| Token | Font | Usage |
|-------|------|-------|
| `--font-sans` | Geist Sans, system-ui | Body text, UI elements |
| `--font-mono` | Geist Mono, Fira Code | Code, scores, ASINs, data values |

### Type Scale

| Size | Tailwind Class | Usage |
|------|---------------|-------|
| 10px | `text-[10px]` | Micro labels (status, keyboard shortcuts, tracking text) |
| 12px | `text-xs` | Captions, secondary labels, badges, filter labels |
| 14px | `text-sm` | Body text, form inputs, nav items, buttons |
| 16px | `text-base` | Page subtitles, section headers |
| 18px | `text-lg` | Page titles |
| 20px | `text-xl` | Hero headings |
| 24px+ | `text-2xl` to `text-4xl` | KPI values, hero numbers |

### Font Weights

| Weight | Tailwind Class | Usage |
|--------|---------------|-------|
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Labels, descriptions, nav items |
| 600 | `font-semibold` | Section headers, data values, card titles |
| 700 | `font-bold` | Page headings, KPI values, tier badges |

---

## 3. Spacing System

Uses Tailwind's default 4px base spacing scale.

| Token | Value | Common Usage |
|-------|-------|-------------|
| `1` | 4px | Tight gaps (icon-label pairs within badges) |
| `1.5` | 6px | Label-to-input spacing |
| `2` | 8px | Small gaps (between badges, between icon and text) |
| `3` | 12px | Medium gaps (card internal groups, nav item gaps) |
| `4` | 16px | Standard padding (sidebar sections, card padding) |
| `5` | 20px | Card internal padding |
| `6` | 24px | Page horizontal padding (desktop) |
| `8` | 32px | Page vertical padding |
| `16` | 64px | Empty state vertical padding |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 12px (`rounded-xl`) | Cards, modals, inputs |
| `--radius-lg` | 16px (`rounded-2xl`) | Large cards, login card |
| `--radius-xl` | 20px | Hero elements |
| `rounded-lg` | 8px | Buttons, badges, nav items |
| `rounded-full` | 9999px | Avatars, status dots, pill badges |

---

## 4. Component Library Catalog

### UI Primitives (`src/components/ui/`)

| Component | File | Purpose |
|-----------|------|---------|
| `Skeleton` | `Skeleton.tsx` | Loading placeholder (shimmer animation) |
| `StatusBadge` | `StatusBadge.tsx` | Status indicator (pending/processing/complete/failed) |
| `MiniChart` | `MiniChart.tsx` | Sparkline charts (line, bar, donut) |
| `SearchDialog` | `SearchDialog.tsx` | Cmd+K global search with keyboard navigation |
| `ExportButton` | `ExportButton.tsx` | Dropdown button for CSV/PDF export |
| `EmptyState` | `EmptyState.tsx` | Illustrated empty state for zero-data pages |
| `ErrorBoundary` | `ErrorBoundary.tsx` | React error boundary with retry |
| `Toast` | `Toast.tsx` | Individual toast notification |
| `ToastProvider` | `ToastProvider.tsx` | Toast context and container |

### Auth Components (`src/components/auth/`)

| Component | File | Purpose |
|-----------|------|---------|
| `LoginForm` | `LoginForm.tsx` | Email/password login form |
| `SignupForm` | `SignupForm.tsx` | Registration with password strength indicator |
| `GoogleSignInButton` | `GoogleSignInButton.tsx` | Google OAuth button |
| `AuthGuard` | `AuthGuard.tsx` | Route protection wrapper |

### Dashboard Components (`src/components/dashboard/`)

| Component | File | Purpose |
|-----------|------|---------|
| `ProductCard` | `ProductCard.tsx` | Product summary card (grid view) |
| `ScoreBadge` | `ScoreBadge.tsx` | Tier score display (S/A/B/C/D) |
| `FilterBar` | `FilterBar.tsx` | URL-synced filter controls |
| `OpportunityTable` | `OpportunityTable.tsx` | Virtual-scrolled product table |
| `AnalysisSummary` | `AnalysisSummary.tsx` | Analysis result summary |
| `AddProductModal` | `AddProductModal.tsx` | ASIN input modal with validation |

### Layout (`src/components/layout/`)

| Component | File | Purpose |
|-----------|------|---------|
| `Sidebar` | `Sidebar.tsx` | Desktop sidebar navigation (legacy) |

### Providers

| Component | File | Purpose |
|-----------|------|---------|
| `ThemeProvider` | `ThemeProvider.tsx` | Dark/light theme context |
| `ToastProvider` | `ui/ToastProvider.tsx` | Toast notification context |

---

## 5. Animation Guidelines

### Framer Motion Patterns

All animated components use Framer Motion. Consistent easing and timing:

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Page enter | 0.4-0.5s | `[0.16, 1, 0.3, 1]` | Cards, sections appearing |
| Modal enter | 0.3s | `[0.16, 1, 0.3, 1]` | Dialogs, overlays |
| Tab switch | 0.2s | default | Content transitions |
| Sidebar active | spring (0.4s, 0.15 bounce) | spring | Nav indicator |
| Hover lift | 0.3s | `cubic-bezier(0.16, 1, 0.3, 1)` | Card hover transform |

### CSS Animation Tokens

Defined in `@theme` for Tailwind utility usage:

| Token | Keyframes | Duration | Usage |
|-------|-----------|----------|-------|
| `animate-fade-in` | `fade-in` | 0.4s | Fade in elements |
| `animate-slide-up` | `slide-up` | 0.5s | Content appearing from below |
| `animate-slide-down` | `slide-down` | 0.4s | Dropdowns, notifications |
| `animate-scale-in` | `scale-in` | 0.3s | Modals, popovers |
| `animate-shimmer` | `shimmer` | 2.5s (loop) | Skeleton loading |
| `animate-glow-pulse` | `glow-pulse` | 3s (loop) | Subtle glow effects |

### Animation Principles

1. **Purposeful motion**: Every animation communicates state change (enter, exit, hover, focus).
2. **Consistent easing**: Use `[0.16, 1, 0.3, 1]` (ease-out-expo) for enters; spring for layout animations.
3. **Subtle transforms**: Cards lift 1px on hover. Never exceed 4px translation.
4. **Respect prefers-reduced-motion**: Use `motion.div` which respects system settings.
5. **Stagger children**: Use `delay` prop with 0.05-0.1s increments for list items.

---

## 6. Glassmorphism Pattern

The signature visual treatment. Used on all cards, sidebars, and modals.

```css
.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: 0 4px 24px var(--shadow-color);
}
```

### When to Use

- **Cards**: Product cards, KPI cards, settings panels
- **Sidebar**: Navigation panel
- **Modals**: Dialog content area
- **Dropdowns**: Export menu, search results

### When NOT to Use

- Page backgrounds (use `bg-mesh` instead)
- Inline text elements
- Small utility badges (use solid backgrounds)

---

## 7. Accessibility Standards

### Requirements

| Standard | Requirement |
|----------|-------------|
| WCAG Level | AA minimum |
| Color contrast | 4.5:1 for normal text, 3:1 for large text |
| Focus indicators | 2px ring with `--ring` color on all interactive elements |
| Keyboard navigation | All interactive elements reachable via Tab; dialogs trap focus |
| Screen readers | Semantic HTML, ARIA labels on icon-only buttons, `role="alert"` on errors |
| Motion | Framer Motion respects `prefers-reduced-motion` |

### Implementation Patterns

**Focus rings:**
```tsx
"focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
```

**Icon-only buttons:**
```tsx
<button aria-label="Close modal">
  <X className="h-4 w-4" />
</button>
```

**Error messages:**
```tsx
<div role="alert" aria-live="assertive">
  {error}
</div>
```

**Form labels:**
```tsx
<label htmlFor="email">Email</label>
<input id="email" aria-describedby="email-error" />
```

---

## 8. Dark / Light Mode Guidelines

### Default: Dark Mode

The app defaults to dark mode (`"dark"` in ThemeProvider state). Users can toggle via the sidebar.

### Implementation

- Theme is controlled by `.dark` class on `<html>` element.
- Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *))` enables class-based dark mode.
- All CSS variables have light and dark variants.
- Components use CSS variable references (`var(--text)`) or Tailwind dark variant (`dark:text-zinc-100`).

### Color Guidelines by Theme

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | White (`#ffffff`) | Near-black (`#09090b`) |
| Card background | Semi-transparent white | Semi-transparent zinc-900 |
| Primary text | Zinc-900 | Zinc-100 / Fafafa |
| Secondary text | Zinc-600 / Slate-500 | Zinc-400 |
| Borders | Light gray, low opacity | Zinc-700, low opacity |
| Gradients | Deeper saturated colors | Lighter pastel variants |
| Shadows | Subtle (`rgba(0,0,0,0.06)`) | Deeper (`rgba(0,0,0,0.4)`) |

### Testing Checklist

- [ ] All text passes 4.5:1 contrast in both modes
- [ ] Glass cards are readable over mesh background in both modes
- [ ] Focus rings are visible in both modes
- [ ] Chart/graph colors are distinguishable in both modes
- [ ] Status colors (success/warning/error) maintain meaning in both modes

---

## 9. Responsive Breakpoints

| Breakpoint | Tailwind Prefix | Behavior |
|-----------|----------------|----------|
| < 640px | (default) | Mobile: single column, hamburger menu, stacked cards |
| >= 640px | `sm:` | Small tablet: 2-column grids |
| >= 768px | `md:` | Tablet: wider cards, more horizontal space |
| >= 1024px | `lg:` | Desktop: fixed sidebar (264px), full layout |
| >= 1280px | `xl:` | Large desktop: max-width container (1280px) |

### Mobile Sidebar Behavior

- **< 1024px**: Sidebar hidden. Top header bar with hamburger button.
- **>= 1024px**: Fixed sidebar at 264px width. No hamburger.
- Mobile sidebar opens as a slide-in overlay with backdrop blur.
