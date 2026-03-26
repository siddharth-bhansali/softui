# Contributing to SoftUI

Thanks for your interest in contributing to SoftUI! Here's how to get started.

## Setup

```bash
# Clone the repo
git clone https://github.com/siddharth-bhansali/softui.git
cd softui

# Install dependencies
bun install

# Start dev server
bun run dev
```

The docs site will be available at `http://localhost:8080`.

## Project Structure

```
src/
  softui.css          # The CSS library
  softui.js           # JS behaviors (modals, dropdowns, etc.)
  components/         # Component docs pages (.njk)
  css/docs.css        # Docs site styles
  js/playground.js    # Playground page JS
  _data/nav.json      # Sidebar navigation
  _data/snippets.json # Playground snippets
  _includes/          # Nunjucks layouts
  index.njk           # Homepage with bento grid
```

## Adding a Component

1. **CSS** — Add styles to `src/softui.css` with `sui-` prefix
2. **JS** (if needed) — Add behavior to `src/softui.js`
3. **Docs page** — Create `src/components/yourcomponent.njk`
4. **Navigation** — Add entry to `src/_data/nav.json` in the appropriate category
5. **Snippet** — Add playground snippet to `src/_data/snippets.json`
6. **Bento card** — Add homepage card to `src/index.njk`

### Docs Page Checklist

- [ ] Every section has a live example AND a "Show Code" block
- [ ] Code blocks contain complete, copy-pasteable HTML (no `...` placeholders)
- [ ] Bento card preview is centered (`justify-content:center`)
- [ ] If the component needs JS, add `requiresJs: true` to frontmatter
- [ ] Section IDs are sequential (`section-1`, `section-2`, etc.)

## Code Style

- All CSS classes use the `sui-` prefix
- No external dependencies
- Dark mode must work (`data-theme="dark"`)
- Use CSS custom properties (`--sui-*`) for theming
- JS should be vanilla — no frameworks, no build step
- Use `button` elements for interactive items, not `div`

## Variants

Most components should include some combination of:

- **Default** — Base version
- **Sizes** — sm, default, lg
- **Colors** — primary, success, danger, warning, info
- **Inset** — Neumorphic pressed-in style
- **Raised** — Neumorphic elevated style (where appropriate)

## Pull Requests

- One component or feature per PR
- Include the docs page with all examples
- Test in both light and dark mode
- Test on desktop and mobile widths
- Run `bun run build` to verify the site builds cleanly

## Reporting Issues

Use [GitHub Issues](https://github.com/siddharth-bhansali/softui/issues) for bug reports and feature requests. Include screenshots when reporting visual issues.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
