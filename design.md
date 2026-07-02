# GaugeHow Redesign System

Source: Stitch project `GaugeHow Modern UI Redesign` (`projects/10864720673016991746`), cross-checked against the earlier `Mechanical Education Hub` screens where light/dark variation was useful.

## Design Direction

GaugeHow uses a corporate-modern engineering learning interface. The visual language is technical, structured, and high-utility, with a light catalog/marketing surface and a dark authenticated learning cockpit.

The system should feel like an engineering workspace: crisp grids, precise spacing, large confidence-building headings, compact labels, technical imagery, and orange progress/action signals. Avoid decorative gradient blobs, overly soft marketing cards, and one-note beige pages.

## Color System

Primary dark experience:

- Base canvas: `#020617`
- Page surface: `#0c1324`
- Raised card: `#0f172a`
- Overlay card: `#1e293b`
- Primary action: `#d97706`
- Bright accent: `#f59e0b`
- Primary text: `#f8fafc`
- Secondary text: `#94a3b8`
- Border: `rgba(255,255,255,0.1)`

Light catalog/marketing experience:

- Base canvas: `#fcf9f8`
- Low surface: `#f6f3f2`
- Card: `#ffffff`
- Soft orange surface: `#fff7eb`
- Primary action: `#db8400`
- Hover/deep action: `#945900`
- Text: `#1c1b1b`
- Muted text: `#544435`
- Border: `#d9c2af`

Orange is reserved for CTAs, active nav, progress, badges, pricing, and “next action” moments. Dark screens use tonal layering rather than heavy shadows.

## Typography

- Headings: Manrope, bold, compact, geometric.
- Body/UI: Inter, readable, neutral.
- Large desktop headline: 48px/56px, 800.
- Mobile headline: 36px/42px, 800.
- Section heading: 24-32px, 600-700.
- Body: 16px/24px.
- Small labels: 12-14px, semibold.
- Keep letter spacing at 0 in implementation to match app accessibility rules.

## Layout

- Desktop max width: 1280px.
- Grid: 12-column feel with 24px gutters.
- Mobile margins: 16px.
- Base spacing: 8px.
- Section gap: 64px.
- Cards use 16px radius for large panels and 8px radius for buttons, inputs, and compact cards.

## Shared Components

Buttons:

- Primary: solid orange, white/dark-on-orange text, 8px radius.
- Secondary: transparent or tonal panel with low-contrast border.
- Icon buttons should use real icons and compact square dimensions.

Inputs:

- Dark: `#0f172a` or `#1e293b` fill, subtle border, orange focus ring.
- Light: white or soft-orange fill, warm outline, orange focus.

Cards:

- Dark: `#0f172a` with 1px white/10 border, no heavy shadow.
- Light: white card with warm border and tight, subtle shadow.
- Image cards use 16:9 media, object-cover, orange/category badges, then compact metadata.

Progress:

- Track: dark overlay or soft orange.
- Fill: orange to bright amber gradient.

Navigation:

- Marketing/catalog: top bar, translucent surface, brand left, links center, account actions right.
- Authenticated dashboard/detail: dark sidebar on desktop, compact dark top bar on mobile, active item filled with orange/amber.

## Screen Patterns

Homepage:

- Light theme.
- Sticky translucent nav.
- Two-column hero: value proposition and CTAs on left, large technical image/workspace panel on right.
- Stats band with four high-contrast metrics.
- Featured course cards in a 3-column grid.

Course Catalog:

- Light theme.
- Centered hero title “Explore Courses”.
- Large search input with inline search button.
- Horizontal category chips.
- 3-column course grid with media, category/rating row, title, description, instructor, price, CTA.

Student Dashboard:

- Dark theme.
- Fixed/sidebar navigation.
- Welcome header with streak/action indicator.
- “Continue Learning” large media card with progress.
- Engineering Copilot card with chat preview, prompt input, suggestion chips.
- Recommended course cards and certification/activity list.

Course Detail:

- Dark theme.
- Top hero grid: video/media card left, course title/pricing/actions right.
- Below: tabs, learning outcomes, curriculum accordion/list, sticky included/instructor/sidebar panel.
- Reviews use compact dark cards.

Auth:

- Dark split layout.
- Left side: cinematic technical lab visual/gradient, logo, value statement, trust badges.
- Right side: glass auth panel, login/signup tabs, social buttons, form fields, orange CTA.

## Extending To Undesigned Pages

Routes not explicitly designed should reuse the dashboard/detail dark shell for authenticated workflows. Data-heavy pages use dark glass cards and compact page headers. Public verification or marketing-adjacent routes use the light catalog surface.
