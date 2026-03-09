# SoftUI — Project Summary

## What is SoftUI?

SoftUI is a **neumorphic CSS library** inspired by the Soft UI / neumorphism design trend. It provides ready-to-use UI components that feature soft shadows, muted color palettes, and tactile depth — elements appear to extrude from or sink into the background surface.

The design direction was sourced from the [Design Shack article on Soft UI](https://designshack.net/articles/trends/soft-ui/), which showcases music apps, dashboards, smart home interfaces, and other examples of the neumorphic style.

## Design Principles

- **Dual shadows** — Every raised element uses a light shadow (top-left) and dark shadow (bottom-right) to create the illusion of depth
- **Inset effects** — Inputs, toggles, and recessed elements use inset shadows to feel carved into the surface
- **Muted palette** — Base colors are soft grays (`#E4E9F0` light, `#2A2D35` dark) with a purple primary accent (`#6C63FF`)
- **Rounded everything** — Generous border-radius (10–24px) with no sharp edges
- **Light typography** — Plus Jakarta Sans, a rounded geometric font that complements the soft aesthetic
- **Smooth transitions** — All interactive states animate with 0.25s ease

## Project Structure

```
softui/
  index.html      — Documentation / showcase page (Bootstrap-docs style)
  softui.css      — The CSS library (all components + utilities)
  TASKS.md        — Task list with completed and upcoming work
  PROJECT.md      — This file
```

## Technical Details

### CSS Architecture
- All theming via **CSS custom properties** (`:root` for light, `[data-theme="dark"]` for dark)
- Class prefix: `sui-` to avoid conflicts
- Shadow tokens: `--sui-shadow-raised`, `--sui-shadow-inset`, etc. for consistency
- No JavaScript dependencies — pure CSS library (docs page uses JS for interactivity only)

### Fonts
- **Plus Jakarta Sans** (Google Fonts) — body/UI text, weights 300–800
- **JetBrains Mono** (Google Fonts) — code blocks

### Dark Mode
- Toggle via `data-theme="dark"` on the `<html>` element
- Overrides background, shadow, and text color variables
- All components adapt automatically — no extra classes needed
- Theme preference persisted in `localStorage`

### Components Built
Buttons, Cards, Forms (inputs, select, textarea, range), Toggles, Checkboxes, Radio Buttons, Badges, Alerts, Progress Bars, Tables, Navbar, Avatars

### Utilities Built
Shadow classes (raised/inset/flat), Border radius (sm/md/lg/full), Spacing (padding + margin 0–5, directional), Text (alignment + colors)

### Docs Features
- Fixed sidebar with section links
- Active section highlighting via `IntersectionObserver`
- Collapsible code blocks for every component with "Copy" button
- Dark mode toggle in sidebar
- All code snippets match their visual examples exactly

## What's Next

Adding more components: Modal, Tooltip, Breadcrumbs, Pagination, Button Group, Tabs, Accordion, Skeleton loaders, Spinners, and Toast notifications. See `TASKS.md` for the full prioritized list.
