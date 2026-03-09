# SoftUI — Task List

## Completed

- [x] Core CSS library (`softui.css`) with CSS custom properties
- [x] Documentation page (`index.html`) — Bootstrap-style component showcase
- [x] Buttons — default, colored, outlined, sizes, icon, pressed, disabled, full-width
- [x] Cards — raised, inset, flat, with header
- [x] Forms — inputs, select, textarea, range slider, validation states
- [x] Toggles, checkboxes, radio buttons
- [x] Badges — colored + pill variants
- [x] Alerts — default, primary, success, danger, warning
- [x] Progress bars — default + colored
- [x] Tables — with proper rounded corners and distinct background
- [x] Navbar component
- [x] Avatars — circle + square, 4 sizes
- [x] Utility classes — shadow, border-radius, spacing, text
- [x] Dark mode — `data-theme="dark"` with variable overrides + toggle button
- [x] Font — Plus Jakarta Sans (Google Fonts) + JetBrains Mono for code
- [x] Sidebar active section tracking via IntersectionObserver
- [x] Code snippets for every component (Show Code toggle + Copy button)
- [x] All code blocks match their visual examples exactly
- [x] Modal / Dialog — CSS complete (backdrop blur, sizes, animations)
- [x] Tooltips — pure CSS, 4 directions, works on any element

## To Do — Audit Fixes (Critical)

- [x] Warning button/badge text contrast — use dark text on `--sui-warning` backgrounds
- [x] Add `:focus-visible` states to buttons (`.sui-btn`)
- [x] Add `:focus-visible` states to toggles, checkboxes, radios
- [x] Add `:focus-visible` states to modal close button and range slider
- [x] Add missing disabled state for radio buttons
- [x] Remove `&times;` from modal code blocks (CSS pseudo-elements handle the X now)
- [x] Add `.sui-pressed` to success, danger, warning, info button `:active` rules
- [x] Add outline variants for warning and info buttons

## To Do — Audit Fixes (Important)

- [x] Navbar hover — `rgba(0,0,0,0.03)` is invisible in dark mode
- [x] Fix code block mismatches — Shadow Classes, Border Radius, Forms, Input States
- [x] Add missing "Show Code" toggles for Spacing/Padding and Text/Alignment subsections
- [x] Fix Colors code block — shows wrong value for `--sui-text-muted`
- [x] Remove dead `border: none` in copy button CSS
- [x] Select arrow SVG doesn't adapt to dark mode

## To Do — `softui.js` (Interactive Behaviors)

- [x] Create `softui.js` — lightweight vanilla JS, no dependencies
- [x] Modal — Escape key to close
- [x] Modal — focus trap (Tab stays inside modal)
- [x] Modal — body scroll lock when open
- [x] Modal — API: `SoftUI.modal('#id').open()` / `.close()`
- [x] Toast — auto-dismiss timer, slide-in trigger, stacking, 6 positions, color variants
- [x] Accordion — smooth expand/collapse with max-height + JS height calculation
- [x] Tabs — switch active tab and content panel
- [x] Dropdown — open/close on click, close on outside click, ESC to close
- [x] Static backdrop — modal shakes instead of closing on outside click

## To Do — New Components

### High Priority
- [x] Breadcrumbs — navigation trail with soft separators
- [x] Pagination — page numbers with pressed/active states (3 variants)
- [x] Button Group — connected buttons on a shared raised surface

### Medium Priority
- [x] Tabs — inset track with raised active tab + pill variant
- [x] Accordion / Collapsible — expandable sections (single/multi-open, nested content, flush)
- [x] Skeleton / Loading placeholder — animated shimmer effect (text, card, media, shapes)
- [x] Spinner / Loader — spin + grow variants, colors, sizes
- [x] Toast notifications — auto-dismissing slide-in alerts (6 positions, 4 color variants, persistent option)

### Nice to Have
- [x] Divider / Separator — horizontal/vertical, groove effect, dashed/dotted, text, colors
- [x] Chip / Tag — dismissible labels with colors, outline, sizes, avatars + JS dismiss
- [x] Stepper — numbered steps with connectors, completed/active/pending states, vertical, sizes, colors
- [x] Dropdown menu — raised floating menu (default, split button, directions, sizing, headers/dividers)
- [x] Slider with labels — range input with live value display, min/max labels, colors, sizes, vertical

## Completed — Variant Additions

- [x] Tables — striped, compact, borderless, inset variants
- [x] Forms/Inputs — sizes (sm/lg), input group (text addon + button), pill/rounded
- [x] Alerts — info color, dismissible (close button + JS animation), filled (colored bg), filled + dismissible combo
- [x] Progress — sizes (sm/lg), warning + info colors, indeterminate (animated)
- [x] Buttons — ghost (no shadow/border), loading (spinner), pill/rounded
- [x] Cards — hoverable (shadow grows on hover), footer section
- [x] Toggles — sizes (sm/lg), color variants (success/danger), disabled state
- [x] Badges — outline variants (all colors), sizes (sm/lg)
- [x] Avatars — group (overlapping stack), status dot (online/busy/offline), inset variant
- [x] Checkboxes — color variants (success/danger), indeterminate state
- [x] Radios — color variants (success/danger)
- [x] Breadcrumbs — arrow separator variant
- [x] Button Group — pill/rounded variant
- [x] Navbar — compact variant, sticky class
- [x] Modal — fullscreen, scrollable (fixed header/footer)
- [x] Modal — static backdrop (shake on outside click)
- [x] Tables — bordered variant
- [x] Pagination — size variants (lg/sm)
- [x] Button Group — vertical, size variants (lg/sm)
- [x] Progress — striped (+ animated), labels inside bar
- [x] Tabs — fill, justified
- [x] Cards — image top, image overlay, horizontal layout
- [x] Badges — positioned (on buttons), notification dot
- [x] Alerts — with icon layout
- [x] Dropdown — sizing (sm/lg), split button, 4 directions, menu alignment, headers/dividers

## To Do — Audit Fixes (Nice to Have)

- [x] Add ARIA attributes — role, aria-expanded, aria-selected, aria-label across all interactive components + JS toggles
- [x] Tooltip edge clipping — max-width 280px, overflow-wrap, `.sui-tooltip-wrap` for multi-line
- [x] Standardize border-radius — added `--sui-radius-xs: 6px` token, replaced 8 hardcoded values
- [x] Standardize transition timings — added `--sui-transition-fast/base/slow` tokens, replaced 13 transition durations

## Completed — Multi-Page Migration (Eleventy)

- [x] Migrate single-page SPA (`index.html`) to multi-page Eleventy (11ty) static site
- [x] Layout chain: page `.njk` → `component.njk` → `base.njk` (Nunjucks templating)
- [x] Sidebar navigation from `nav.json` data file with active state
- [x] 6 interactive component pages (buttons, badges, alerts, cards, toggles, progress) with live playground
- [x] 15 gallery-only component pages with "Show Code" toggles and "On This Page" TOC
- [x] Homepage with hero + bento grid linking to all components
- [x] Docs CSS extracted to `src/css/docs.css`
- [x] Fix DOM timing issues (DOMContentLoaded for interactive scripts)
- [x] Fix tooltip mouseenter/mouseleave error (guard for text nodes)
- [x] Fix CSS class mismatches (cards, tooltips, pagination, breadcrumbs, shadows)
- [x] Fix pagination HTML structure to match CSS (`.sui-page-item` > `.sui-page-link`)
- [x] Fix breadcrumb HTML structure to match CSS (`.sui-breadcrumb-item` > `a`)
- [x] Fix tooltip attribute (`data-sui-tooltip` not `data-tooltip`)
- [x] Add `.sui-raised-lg` utility class to CSS
- [x] Add `margin-bottom` to pill tab list for spacing
- [x] Fix underlined tabs: full-width border + remove card top radius below
- [x] Increase breadcrumb separator margin for better spacing
- [x] Expand all table variants to 5 columns with richer data
- [x] Expand scrollable modal content to actually scroll on large screens

## Completed — Layout System

- [x] Containers — `.sui-container` with responsive breakpoints, fluid, sm/md/lg/xl variants
- [x] 12-column grid — `.sui-row` + `.sui-col-{1-12}` with responsive variants (sm/md/lg/xl)
- [x] Gutters — `.sui-g-{0-5}`, `.sui-gx-{0-5}`, `.sui-gy-{0-5}`
- [x] Offsets — `.sui-offset-{1-11}`
- [x] Flex utilities — display, direction, justify, align, wrap

## Completed — Recent Fixes

- [x] Fix `.sui-check-mark` class mismatch in toggles template
- [x] Fix `.sui-hint` / `.sui-hint-error` / `.sui-hint-success` class aliases
- [x] Fix `.sui-input-addon` alias for `.sui-input-group-text`
- [x] Fix table-in-card — reset shadow/radius for `.sui-table` inside `.sui-card`
- [x] Fix underlined tab panel — `:only-child` scoping for top-radius removal
- [x] Fix tab panel spacing — `padding-top: 20px` on `.sui-tab-panel`
- [x] Add `sui-navbar-full` modifier (no radius, overflow visible)
- [x] Add gap utilities (`sui-gap-{0-5}`)
- [x] Add auto-margin utilities (`sui-ms-auto`, `sui-me-auto`, `sui-mx-auto`)
- [x] Add Flex utilities docs page (`/utilities/flex/`)
- [x] Demo project — self-contained login + dashboard (`demo/` folder)

## To Do — New Components (from shadcn/ui audit)

### High Priority
- [x] Sheet / Drawer — side panel overlay (left/right/top/bottom), extends modal concept with slide-in animation
- [x] Popover — floating content box triggered by click, positioned near trigger element
- [x] Hover Card — popup card on hover with arrow, preview content (like user profile cards)
- [x] Alert Dialog — confirmation dialog variant (added as Modal section: sui-modal-sm + sui-modal-static + role="alertdialog")

### Medium Priority
- [x] Carousel — image/content slider with prev/next, dots, auto-play, neumorphic controls
- [x] Toggle Group — group of toggleable buttons (single/multi select), extends button group
- [x] Input OTP — one-time password input with individual digit boxes, auto-focus advance
- [x] Collapsible — simple single-section expand/collapse (lighter than accordion)
- [x] Kbd — keyboard shortcut display component (inline badge-like element for keys)
- [x] Scroll Area — custom neumorphic scrollbar styling

### Nice to Have
- [x] Aspect Ratio — utility classes for common aspect ratios (1:1, 4:3, 16:9, 21:9)
- [x] Typography — heading scale, lead text, blockquote, lists, inline code styling
- [x] Menubar — horizontal menu bar with dropdowns (desktop app-style)
- [x] Combobox — searchable select/autocomplete input
- [x] Resizable — drag-to-resize panels with neumorphic handle

### Previously Deferred (now adding)
- [x] Context Menu — right-click menu with submenus, checkboxes, radios, keyboard nav
- [x] Command Palette — Cmd+K searchable command list with groups, icons, shortcuts, dialog mode
- [x] Calendar / Date Picker — month grid, navigation, single/range selection, date picker popover, disabled dates, two-month view
- [x] Chart — CSS-only bar/donut + minimal SVG line charts (vertical/horizontal/stacked bar, donut, pie, line, area)
- [x] Data Table — sortable, filterable, paginated tables
- [x] Drag & Drop — sortable lists, kanban board, file drop zone

## To Do — New Components (Round 3)

### High Priority
- [ ] Sidebar — collapsible app sidebar with nav links, sections, icons, mini/expanded modes
- [ ] Timeline — vertical event timeline with dots, connectors, dates, icons, colors
- [ ] Stat Card — KPI display with value, label, trend arrow, delta percentage

### Medium Priority
- [ ] Rating — star/heart rating input with hover preview, sizes, colors, half-star, read-only
- [ ] Chat Bubble — message bubbles with avatar, timestamp, sent/received sides
- [ ] File Upload — styled file input with preview thumbnails, progress, complements Drop Zone
- [ ] Color Picker — neumorphic color swatch selector or spectrum input

### Nice to Have
- [ ] Dock — macOS-style icon bar with hover magnification effect
- [ ] Swap — animated toggle between two elements (icon flip, text swap)
- [ ] Diff — side-by-side visual comparison of content
- [ ] Stack — overlapping cards/images with offset
- [ ] Radial Progress — circular progress ring with percentage label

## To Do — Improvements
- [x] Add a README.md (project overview, structure, running locally, build, status)
- [x] Responsive testing and mobile refinements
- [x] Accessibility audit (contrast, focus states, ARIA)
- [x] Minified production build of `softui.css`
- [ ] Consider packaging (npm, CDN)
