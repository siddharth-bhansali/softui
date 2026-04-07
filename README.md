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
| **68+ Components** | Buttons, Cards, Modals, Tables, Tabs, Calendar, Charts, Pricing, and more |
| **Dark Mode** | Add `data-theme="dark"` and everything adapts |
| **Zero Dependencies** | Pure CSS + vanilla JS. No build step required |
| **CSS Variables** | Fully customizable via custom properties |
| **Design Tokens** | `tokens.json` for syncing with Tailwind, Figma, or any tool |
| **Responsive Grid** | 12-column flexbox grid with breakpoints and gap utilities |
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

That's it. Every component adapts automatically.

---

## Components

**Forms** &mdash; Input, Styled Select, Textarea, Toggle, Checkbox, Radio, Slider, OTP, Combobox, Color Picker, File Upload, Tags Input, Number Input, Password Input

**General** &mdash; Buttons, Button Group, Card, Badge, Avatar, Chip, Divider, Kbd, Copy Button, Swap, Pricing

**Data Display** &mdash; Table, Data Table, Chart, Stat Card, Timeline, Chat Bubble, Calendar, Tree View, Radial Progress, Rating

**Feedback** &mdash; Alert, Toast, Progress, Skeleton, Spinner, Loading Overlay

**Navigation** &mdash; Navbar, Tabs, Breadcrumb, Pagination, Stepper, Menubar, Sidebar, Dock, Speed Dial, Tour

**Overlays** &mdash; Modal, Sheet, Dropdown, Popover, Hover Card, Tooltip, Context Menu, Command Palette, Image Lightbox

**Layout** &mdash; Container, Grid, Flex utilities, Resizable, Scroll Area, Collapsible, Accordion, Carousel, Toggle Group, Drag & Drop

**Media** &mdash; Diff, Stack, Browser Mockup, Phone Mockup, Marquee, Typewriter, Text Rotate

**Utilities** &mdash; Shadows, Radius, Spacing, Text, Typography, Aspect Ratio, Display, Position, Sizing, Opacity, Cursor, Flex

> Browse all components at [softui-css.netlify.app](https://softui-css.netlify.app) or try them in the [Playground](https://softui-css.netlify.app/playground/).

---

## Customization

SoftUI is built on CSS custom properties. Override them to make it yours:

```css
:root {
  --sui-primary: #7C5CFC;
  --sui-radius: 12px;
  --sui-font: 'Inter', sans-serif;
}
```

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

All modern browsers &mdash; Chrome, Firefox, Safari, Edge.

## License

[MIT](LICENSE)
