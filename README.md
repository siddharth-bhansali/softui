# SoftUI

A neumorphic CSS component library with soft shadows, muted palettes, and tactile depth. No dependencies. Dark mode included.

## Install

```bash
npm install softui
```

### CDN

```html
<link rel="stylesheet" href="https://unpkg.com/softui/dist/softui.min.css">
<script src="https://unpkg.com/softui/dist/softui.min.js"></script>
```

### Manual

Download `softui.min.css` and `softui.min.js` from the `dist/` folder and include them in your HTML:

```html
<link rel="stylesheet" href="softui.min.css">
<script src="softui.min.js"></script>
```

## Quick Start

```html
<button class="sui-btn sui-btn-primary">Click me</button>

<div class="sui-card sui-raised" style="padding: 24px;">
  <h3>Hello SoftUI</h3>
  <p>A neumorphic card with a soft raised shadow.</p>
</div>
```

## Dark Mode

Add `data-theme="dark"` to the `<html>` element. All components adapt automatically.

```html
<html data-theme="dark">
```

## Components

**Layout** — Container, Grid (12-col responsive), Flex utilities

**Forms** — Input, Select, Textarea, Toggle, Checkbox, Radio, Slider, Input OTP, Combobox

**Data Display** — Table, Data Table (sort/filter/paginate), Card, Badge, Avatar, Kbd, Chart, Stat

**Feedback** — Alert, Toast, Progress, Skeleton, Spinner

**Navigation** — Navbar, Tabs, Breadcrumb, Pagination, Stepper, Menubar

**Overlay** — Modal, Sheet/Drawer, Dropdown, Popover, Hover Card, Tooltip, Context Menu, Command Palette

**Interactive** — Accordion, Collapsible, Carousel, Toggle Group, Calendar, Drag & Drop

**Content** — Chip, Divider, Scroll Area, Resizable, Button Group

**Utilities** — Shadows, Border Radius, Spacing, Text/Colors, Aspect Ratio, Typography

## CSS Custom Properties

SoftUI is built on CSS variables. Override them to customize:

```css
:root {
  --sui-primary: #7C5CFC;
  --sui-radius: 12px;
  --sui-shadow-raised: 6px 6px 12px rgba(0,0,0,0.15), -6px -6px 12px rgba(255,255,255,0.05);
}
```

## Browser Support

All modern browsers (Chrome, Firefox, Safari, Edge). No IE support.

## License

MIT
