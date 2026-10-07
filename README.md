<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/siddharth-bhansali/softui/main/assets/banner-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/siddharth-bhansali/softui/main/assets/banner-light.png">
    <img alt="SoftUI — Neumorphic CSS Components" src="https://raw.githubusercontent.com/siddharth-bhansali/softui/main/assets/banner-light.png" width="100%">
  </picture>
</p>

<h1 align="center">SoftUI</h1>

<p align="center">
  A neumorphic CSS library with soft shadows, muted palettes, and tactile depth.<br>
  Zero dependencies. Dark mode built in. Just drop it in.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/softui-css"><img src="https://img.shields.io/npm/v/softui-css?color=5B54E0&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/softui-css"><img src="https://img.shields.io/npm/dm/softui-css?color=22c55e" alt="npm downloads"></a>
  <a href="https://github.com/siddharth-bhansali/softui/blob/main/LICENSE"><img src="https://img.shields.io/github/license/siddharth-bhansali/softui?color=f59e0b" alt="license"></a>
  <a href="https://softui-css.netlify.app"><img src="https://img.shields.io/badge/docs-live-5B54E0" alt="docs"></a>
  <a href="https://buymeacoffee.com/siddharthbhansali"><img src="https://img.shields.io/badge/buy%20me%20a%20coffee-FFDD00?logo=buymeacoffee&logoColor=000" alt="buy me a coffee"></a>
</p>

<p align="center">
  <a href="https://softui-css.netlify.app"><strong>Documentation</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://softui-demo.netlify.app"><strong>Live Demo</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://softui-css.netlify.app/playground/"><strong>Playground</strong></a> &nbsp;&middot;&nbsp;
  <a href="https://buymeacoffee.com/siddharthbhansali"><strong>Buy Me a Coffee ☕</strong></a>
</p>

---

## Highlights

| Feature | Description |
|---|---|
| **80+ Components** | Buttons, Cards, Modals, Tables, Tabs, Calendar, Charts, Pricing, Footer, and more |
| **Dark Mode** | Add `data-theme="dark"` and everything adapts, on the page or on any section |
| **Theme Switcher** | `data-sui-theme-toggle` on any button: saves the choice, follows the OS, syncs across tabs |
| **Zero Dependencies** | Pure CSS + vanilla JS. No build step required |
| **CSS Variables** | Fully customizable via custom properties |
| **RTL Support** | Right-to-left layout for Arabic, Hebrew, Farsi |
| **Accessible** | Coloured text and text on filled components meet WCAG AA (4.5:1) in light and dark; focus-visible rings, keyboard support, ARIA, prefers-reduced-motion (CSS and JS) |
| **Responsive Grid** | 12-column flexbox grid with breakpoints, gutters and a 0-7 spacing scale |
| **Embed Build** | `softui-embed.min.css` adds SoftUI to an existing site without touching its global styles |
| **Interactive Playground** | Write HTML and preview components live in the browser |

---

## Install

```bash
npm install softui-css
```

### CDN

```html
<link rel="stylesheet" href="https://unpkg.com/softui-css/dist/softui.min.css">
<script src="https://unpkg.com/softui-css/dist/softui.min.js"></script>
```

### Fonts (optional)

SoftUI doesn't bundle fonts. Its default stacks start with Plus Jakarta Sans and JetBrains Mono and fall back to system fonts when they aren't loaded. To use them, load them from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

or self-host them with Fontsource (`npm i @fontsource-variable/plus-jakarta-sans @fontsource-variable/jetbrains-mono`, then import both packages). The `Variable` family names are already in the default stacks.

---

## Quick Start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="https://unpkg.com/softui-css/dist/softui.min.css">
</head>
<body class="sui-d-flex sui-justify-center sui-align-center sui-min-vh-100">

  <div class="sui-card sui-raised sui-p-5 sui-text-center">
    <h3>Hello SoftUI</h3>
    <p class="sui-text-muted sui-mt-2 sui-mb-3">
      A neumorphic card with a soft raised shadow.
    </p>
    <button class="sui-btn sui-btn-primary">Get Started</button>
  </div>

  <script src="https://unpkg.com/softui-css/dist/softui.min.js"></script>
</body>
</html>
```

---

## Dark Mode

```html
<html data-theme="dark">
```

That's it. Every component adapts automatically. `data-theme` works on any element too, so one section can be dark on a light page.

### Theme toggle

`softui.js` includes a theme switcher. Add `data-sui-theme-toggle` to any button:

```html
<button class="sui-theme-toggle" data-sui-theme-toggle aria-label="Dark mode">
  <svg class="sui-theme-toggle-sun" viewBox="0 0 24 24" aria-hidden="true">...</svg>
  <svg class="sui-theme-toggle-moon" viewBox="0 0 24 24" aria-hidden="true">...</svg>
</button>

<!-- Or set a value: "light", "dark", or "system" (follow the OS again) -->
<button data-sui-theme-toggle="system">System</button>
```

The choice is saved and synced across tabs; until the user picks one, the OS setting is followed. From JS: `SoftUI.theme.toggle()`, `.set('dark')`, `.clear()`, `.get()`, and a `sui-theme-change` event. To avoid a flash on load, see the [Theming Guide](https://softui-css.netlify.app/theming/).

---

## Using in an Existing Site

Neumorphic shadows need the SoftUI background (`--sui-bg`) behind them. SoftUI styles `<body>` for you. If your site has its own background, either wrap SoftUI sections in `.sui-surface`, add `.sui-flat` to individual components, or add `.sui-flat-all` to a container to flatten everything inside it:

```html
<!-- A SoftUI section inside an existing page -->
<section class="sui-surface">
  <div class="sui-card">...</div>
</section>

<!-- data-theme works on any element, so a section can be dark on a light page -->
<section class="sui-surface" data-theme="dark">...</section>

<!-- A component on your own background -->
<button class="sui-btn sui-flat">Save</button>

<!-- Every component in an area, including toggle knobs and slider thumbs -->
<form class="sui-flat-all">...</form>
```

A dark theme on a page darker than `--sui-bg` shows a faint halo around raised components; wrap it in `<div class="sui-surface" data-theme="dark">` or use `.sui-flat-all`.

**Embed build** (v1.16.0 and later). If your site has its own base styles, use `softui-embed.min.css` instead of `softui.min.css`:

```html
<link rel="stylesheet" href="https://unpkg.com/softui-css/dist/softui-embed.min.css">
```

It has the same components and tokens, but leaves out the global `*` reset, `<body>` styling, element typography (headings, paragraphs, links, `code`) outside SoftUI elements, the page scrollbar, and the global reduced-motion and print rules. Those base styles apply only inside elements with a `sui-` class (utility classes included). Components still need `.sui-surface` or `.sui-flat` for their shadows. Use one stylesheet or the other, not both.

---

## JavaScript and Frameworks

Most components are pure CSS. Interactive ones use `softui.js`, which sets everything up on page load and exposes `window.SoftUI`. The package also exports it, so `import SoftUI from 'softui-css'` and `require('softui-css')` work; importing on the server (SSR) is a no-op.

In single-page apps, call `SoftUI.init(el)` after rendering markup that uses JS components. It takes an element, a selector, or nothing, and is safe to call again:

```js
import 'softui-css/dist/softui.min.css';
import SoftUI from 'softui-css';

// React: useEffect(() => { SoftUI.init(ref.current); }, []);
// Vue:   onMounted(() => SoftUI.init(el.value));
// Svelte: onMount(() => SoftUI.init(node));
```

Other APIs: `SoftUI.modal(el)`, `SoftUI.sheet(el)` (selector or element), `SoftUI.toast()`, `SoftUI.tour()`, `SoftUI.carousel()`, `SoftUI.sidebar()`, `SoftUI.reveal()`, `SoftUI.theme`, `SoftUI.version`. Toast and tour text is inserted as plain text unless you pass `html: true`. All component events bubble and use `sui-*` names (`sui-date-select`, `sui-swap-change`, `sui-copy`, ...).

---

## Components

**Forms** &mdash; Input, Styled Select, Textarea, Toggle, Checkbox, Radio, Slider, OTP, Combobox, Color Picker, File Upload, Tags Input, Number Input, Password Input, Segmented Control, Editable Text, Radio Card, Checkbox Card

**General** &mdash; Buttons, Button Group, Card, Badge, Status Dot, Avatar, Chip, Divider, Kbd, Copy Button, Swap, Pricing, Hero, Links, List Group

**Data Display** &mdash; Table, Data Table, Chart, Stat Card, Timeline, Chat Bubble, Calendar, Tree View, Radial Progress, Rating, Descriptions, Countdown

**Feedback** &mdash; Alert, Toast, Progress, Skeleton, Spinner, Loading Overlay, Result

**Navigation** &mdash; Navbar, Tabs, Breadcrumb, Pagination, Stepper, Menubar, Sidebar (with mobile drawer), Dock, Speed Dial, Tour, Navigation Menu, Scrollspy, Footer

**Overlays** &mdash; Modal, Sheet, Drawer, Dropdown, Popover, Hover Card, Tooltip, Context Menu, Command Palette, Image Lightbox

**Layout** &mdash; Container, Grid, Section, Flex utilities, Resizable, Scroll Area, Collapsible, Accordion, Drag & Drop

**Media** &mdash; Carousel, Diff, Stack, Browser Mockup, Phone Mockup, Marquee, Typewriter, Text Rotate, Toggle Group

**Utilities** &mdash; Shadows, Radius, Spacing, Text, Typography, Aspect Ratio, Display, Position, Sizing, Images, Opacity, Cursor, Flex, Mask, Scroll Reveal, Theme Toggle

> Browse all components at [softui-css.netlify.app](https://softui-css.netlify.app) or try them in the [Playground](https://softui-css.netlify.app/playground/).

---

## Customization

SoftUI is built on CSS custom properties. Override them to make it yours:

```css
:root {
  --sui-primary: #7C5CFC;
  --sui-radius: 12px;
  --sui-font: 'Inter', sans-serif;
  --sui-font-mono: 'JetBrains Mono', monospace;
}
```

Coloured text uses separate text-safe shades (`--sui-primary-text`, `--sui-success-text`, ...). If you change `--sui-primary`, set `--sui-primary-text` and `--sui-primary-text-hover` for light and dark too, so links and outline buttons keep AA contrast. Spacing utilities read `--sui-space-0` to `--sui-space-7`.

### Design Tokens

All design values are also available as JSON for use with Tailwind, Figma, or any tool:

```js
import tokens from 'softui-css/dist/tokens.json';
// tokens.colors.primary → "#5B54E0"
// tokens.radius.default → "16px"
```

See the [Theming Guide](https://softui-css.netlify.app/theming/) for the full variable reference.

---

## Browser Support

All modern browsers &mdash; Chrome, Firefox, Safari, Edge. Tints, glows and focus rings use `color-mix()` (Chrome/Edge 111+, Safari 16.2+, Firefox 113+); older browsers lose those effects but layout and components still work.

## License

[MIT](LICENSE)
