---
name: Monospace Editorial Calendar
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c9c6c5'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#626262'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1d1b1a'
  on-tertiary-container: '#868381'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e6e1df'
  tertiary-fixed-dim: '#cac6c3'
  on-tertiary-fixed: '#1d1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-xl:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: JetBrains Mono
    fontSize: 26px
    fontWeight: '500'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  label-uppercase:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  caption-lower:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system articulates an architectural, high-key minimalist aesthetic tailored for direct personal scheduling and editorial booking workflows. It rejects unnecessary decorative chrome, relying instead on structural grid discipline, high-density typographic order, and absolute functional clarity.

The visual tone evokes bespoke stationery, precision instrumentation, and modern Swiss editorial publishing. The interface prioritizes calm authority, deliberate pacing, and effortless legibility. Layouts are constructed with uncompromising alignment, generous negative space, and strict monochromatic discipline, creating an experience that feels disciplined, curated, and respectful of the user's focus.

## Colors

The palette is strictly high-key monochromatic, leaning on absolute values of ink and light to maintain maximum clarity and effortless compliance with WCAG AA/AAA standards.

- **Primary (`#0A0A0A` / Ink):** Applied to primary typography, structural icons, and solid inverted interaction states.
- **Secondary (`#6B6B6B` / Muted Ink):** Reserved for metadata, helper strings, and secondary labels. Tested against white backgrounds to ensure minimum 4.5:1 contrast.
- **Background & Panels (`#FFFFFF`):** High-key white canvas. Floating sheets and elevated booking slots adopt an explicit 90% opacity overlay (`rgba(255, 255, 255, 0.90)`) paired with system backdrop blurs.
- **Structural Hairlines (`rgba(10, 10, 10, 0.12)`):** Architectural 1px dividers that define boundaries and columns without visually cluttering the viewport.
- **Focus Rings:** Explicit 2px offset solid `#0A0A0A` outlines ensuring uncompromised keyboard navigation visibility.

## Typography

The typography system relies exclusively on monospaced geometry (`JetBrains Mono`), establishing a rigorous, tabular cadence across all textual and numerical components.

- **Uppercase Section Labels (`label-uppercase`):** Rendered strictly at 12px with explicit uppercase transformation and `0.04em` tracking. Used for categories, column anchors, and field headers.
- **Helper & Supplementary Text (`caption-lower`):** Set at 14px in muted ink (`#6B6B6B`) with strict lowercase transformation to create typographic contrast against structured headlines.
- **List & Slot Titles (`headline-lg` / `headline-lg-mobile`):** Scaled at 20px on desktop screens, stepping down fluidly to 18px on mobile devices.
- **Tabular Alignment:** All numerals, dates, time markers, and currency figures align naturally on the monospace character grid without shifting layout width during updates.

## Layout & Spacing

The layout is architected around a fixed, proportioned 12-column grid on desktop screens that reflows into a single-column stacked view on mobile devices.

- **Desktop (>= 1024px):** Fixed-column editorial layout (max-width `1200px`) centered within 3rem (`48px`) outer margins and 1.5rem (`24px`) gutters. Side rails display booking parameters while the primary calendar grid expands across the remaining columns.
- **Tablet (768px - 1023px):** Fluid 8-column layout with 2rem (`32px`) margins and 1.25rem (`20px`) gutters.
- **Mobile (< 768px):** Single-column vertical stream with 1.25rem (`20px`) outer safe margins. Horizontal dividers span full bleed across the screen to anchor individual date cells.
- **Touch Target Integrity:** All interactive elements, calendar dates, and slot targets enforce a strict minimum bounding box of 48x48px, even when the visible typography or border outline is compact.

## Elevation & Depth

Visual depth is achieved through structural layered transparency and razor-thin hairline borders rather than artificial drop shadows:

- **Tonal Layers:** Deepest ground sits at solid `#FFFFFF`. Floating booking summary sidebars, sticky calendar date headers, and dialog sheets utilize translucent `#FFFFFF` at 90% opacity overlaid with a 12px backdrop blur filter (`backdrop-filter: blur(12px)`).
- **Hairline Framing:** Depth and component separation are established strictly through 1px border lines utilizing `rgba(10, 10, 10, 0.12)`. When panels stack, borders maintain strict geometric alignment with no drop shadows or ambient fuzziness.
- **Interaction Inversion:** Elevation changes during hover or focus are communicated by inverting the field (`#0A0A0A` background with `#FFFFFF` text), producing an instantaneous visual lift without altering physical dimensions.

## Shapes

The shape vocabulary is strictly architectural and restrained:

- Base corner curvature is constrained between 2px and 4px (level `1`), avoiding exaggerated pill shapes or purely raw non-antialiased corners.
- Interactive controls, time slot cards, and segmented toggles utilize `rounded-sm` (2px) or `rounded` (4px).
- Internal divider lines terminate cleanly with square endpoints flush against the container hairlines.

## Components

### Buttons & Interactive Slots
- **Default State:** Transparent or white panel background, 1px perimeter border at `rgba(10, 10, 10, 0.12)`, text `#0A0A0A`. Minimum height 48px, minimum width 48px for icon/date buttons.
- **Active / Hover State:** Pure color inversion—fill shifts instantly to `#0A0A0A` and text/iconography flips to `#FFFFFF`. Border transitions to `#0A0A0A`.
- **Disabled State:** Border reduced to `rgba(10, 10, 10, 0.06)`, text muted to `#A3A3A3`, non-responsive.

### Time & Booking Chips
- Compact scheduling chips with 12px uppercase text, framed with a 1px hairline border.
- Hover or keyboard active states trigger complete monochromatic inversion. Selected slots retain solid `#0A0A0A` fill with a subtle 2px dot indicator.

### Lists & Calendar Rows
- Separated by horizontal 1px lines at `rgba(10, 10, 10, 0.12)`.
- Titles formatted using `headline-lg` (20px desktop / 18px mobile). Metadata and timestamp subtitles use lowercase `caption-lower` in `#6B6B6B`.
- Row items maintain a minimum 48px height with vertically centered content and end-aligned duration or price labels.

### Checkboxes & Radio Selection
- 18x18px squares or rings centered within a minimum 48x48px hit area.
- Unchecked: 1px border `rgba(10, 10, 10, 0.24)`.
- Checked: Solid `#0A0A0A` fill with a crisp 1.5px white checkmark or inner square.

### Input Fields
- Underlined or boxed with 1px hairlines at `rgba(10, 10, 10, 0.12)`.
- Top label set in 12px uppercase monospace with 0.04em tracking. Inline placeholder text in `#6B6B6B`.
- Helper and error hints set in 14px lowercase monospace below the input boundary.
- Focused: Border transitions to solid `#0A0A0A` with a 2px offset focus ring.

### Cards & Reservation Sheets
- Encased in 90% opaque white backdrops with 12px blur.
- Outer border 1px `rgba(10, 10, 10, 0.12)` with 4px corner radius.
- Padding structured strictly on the spacing scale (`space-lg` desktop, `space-md` mobile).

## Media and Glass (overrides the solid-white rules wherever background media is present)

- Every booking type has a full-bleed background image or video. The white overlay on media is at most 30%. Never wash media out to near white.
- Panels over media are glass: white at about 58% opacity, 18px backdrop blur with saturation 1.6, a 1px white border at 70% opacity, a subtle inner top highlight and a soft shadow (0 8px 32px at 8% black). Text-dense panels (contact, status, sheets, forms) may use up to 78% white for legibility. Solid white panels are for content-only screens.
- Layout: four corner labels as flat bracketed text (date top-left, contact top-right, visual toggle bottom-left, current status bottom-right); brand card top-left; selection list right of centre; the Priority row carries a lock icon beside its ACCESS text.
- Copy discipline: the main page shows only number, title and ACCESS per type. Approval rules, durations and descriptions appear only after a type is opened. Do not add demo chips, status tags or descriptive lines that are not in the design.
- Reference material: always use Stitch screenshots that show the background media and the monospace font. A screenshot with a serif font or no background is a failed capture and must not be used as a reference.
