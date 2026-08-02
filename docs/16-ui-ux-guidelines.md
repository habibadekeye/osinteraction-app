# HSE OPS AI — UI/UX Guidelines

## Design Philosophy

**Field-first, safety-critical**: Designs assume the user may be on a phone with gloves, in poor lighting, with limited connectivity. Clarity beats aesthetics.

## Color System

| Palette | Usage | Tailwind Classes |
|---------|-------|-----------------|
| Navy (dark blue) | App shell, sidebar, backgrounds | `navy-50` to `navy-950` |
| Flame (orange) | Brand accent, primary CTAs, active states | `flame-50` to `flame-500` |
| Green | Success, safe/approved states | `green-50`, `green-700` |
| Yellow/Amber | Warnings, medium risk, in-progress | `yellow-50`, `yellow-700` |
| Red | Errors, critical risk, danger | `red-50`, `red-700` |
| Gray | Neutral text, borders, inactive | `gray-50` to `gray-900` |

**Prohibited**: Purple/indigo/violet hues. These colours have no semantic meaning in the HSE context.

## Risk Level Color Mapping

```typescript
const RISK_COLORS = {
  low:      'bg-green-50 text-green-700 border-green-200',
  medium:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  high:     'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};
```

Consistent across: risk assessment steps, observation severity badges, document risk levels, governance priority badges.

## Typography

- **Font**: System font stack — no custom web fonts to ensure offline reliability
- **Headings**: `font-bold`, 120% line-height
- **Body**: `text-sm` (14px) throughout UI, 150% line-height
- **Max 3 font weights**: normal (400), medium (500), bold (700)
- **Minimum contrast**: 4.5:1 for normal text, 3:1 for large text (WCAG AA)

## Spacing System (8px base)

```
space-1 = 4px    (tight padding within components)
space-2 = 8px    (component inner padding)
space-3 = 12px
space-4 = 16px   (standard section gap)
space-6 = 24px   (section separator)
space-8 = 32px   (page section gap)
```

## Component Patterns

### Navigation Item
```tsx
<Link to={path} className={`nav-item ${active ? 'nav-item-active' : 'nav-item-inactive'}`}>
  <Icon className="w-4 h-4 flex-shrink-0" />
  <span className="truncate">{label}</span>
</Link>
```

### Page Header
```tsx
<div className="bg-white border-b border-gray-200 px-6 py-4">
  <h1 className="text-xl font-bold text-gray-900">{title}</h1>
  <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
</div>
```

### Data Cards
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
  ...
</div>
```

### Risk Badge
```tsx
<span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${RISK_COLORS[level]}`}>
  {level.charAt(0).toUpperCase() + level.slice(1)}
</span>
```

### Primary Button
```tsx
<button className="bg-flame-500 hover:bg-flame-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
  Action
</button>
```

### Danger Button
```tsx
<button className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
  Delete
</button>
```

## Emergency Page Special Rules

- Background: `bg-gray-950` (near-black) for high visual priority
- Emergency scenario cards: large tap targets minimum 48×48px
- Color: Red/orange only — no ambiguity about severity
- Quick action buttons: minimum `text-base`, not `text-sm`
- No animations on emergency content — static is faster to read

## Chat Interface Rules

- AI message bubbles: left-aligned, `bg-navy-800` on dark background
- User message bubbles: right-aligned, `bg-flame-500/10`
- Escalation messages: full-width `bg-red-900/20 border-red-500` with ⚠️ warning icon
- Citations: collapsible below the message, `text-xs text-navy-400`
- Streaming text: cursor blink animation during streaming

## Loading States

```tsx
// Skeleton for list items
<div className="animate-pulse bg-gray-200 rounded h-4 w-3/4 mb-2" />

// Inline spinner for button loading
<Loader2 className="w-4 h-4 animate-spin" />
```

## Empty States

Every list that can be empty needs an empty state:
```tsx
<div className="text-center py-12">
  <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
  <p className="text-gray-500 font-medium">No {items} yet</p>
  <p className="text-gray-400 text-sm mt-1">Create your first {item}</p>
</div>
```

## Responsive Breakpoints

| Breakpoint | Target | Layout Change |
|-----------|--------|--------------|
| `< lg` (1024px) | Tablet / Mobile | Sidebar hidden, mobile nav overlay |
| `lg+` | Desktop | Full sidebar visible |
| `< md` (768px) | Phone | Single column, larger tap targets |

Sidebar collapses to icon-only mode on desktop via toggle (persisted in state). On mobile, overlay drawer.

## Accessibility Minimums

- All interactive elements: visible focus ring (`focus:ring-2 focus:ring-flame-500`)
- Icon-only buttons: `title` attribute for screen readers
- Form inputs: always have associated `<label>`
- Colour not used as the sole indicator (always also use icon or text label)
