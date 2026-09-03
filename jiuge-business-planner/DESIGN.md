# DESIGN.md: The Living Library-inspired diagnosis UI

## Source

- URL: https://thelivinglibrary.app/
- Capture date: 2026-08-28
- Evidence: Firecrawl branding, images, page markdown and full-page screenshot

## Reference Screenshot

![Full-page screenshot of The Living Library](./.firecrawl/living-library-screenshot.png)

Use this screenshot as the source of truth for hierarchy, whitespace, typographic contrast and restrained interaction. Do not copy its brand, logo, wording or imagery.

## Design Summary

Quiet editorial product UI. A serif display face carries the primary heading while a neutral sans-serif carries all operational information. The interface is centered, sparse and almost flat. Warm orange is used as a single action and focus accent. Thin rules and whitespace replace decorative cards.

For 九格经营, adapt this language to a business diagnosis rather than recreate a cream landing page: use a near-white canvas, dark chocolate text, warm ivory only for selected surfaces, and a small olive status color so the interface does not become a one-hue beige theme.

## Design Tokens

### Colors

- Canvas: `#FCFAF7`
- Surface: `#FFFFFF`
- Ink: `#211A16`
- Muted text: `#756B63`
- Fine rule: `#E8E0D7`
- Primary accent: `#DE8742`
- Primary accent soft: `#FBEEE2`
- Secondary status: `#5F725D`
- Error: `#A9412D`
- Dark action: `#2A211C`

### Typography

- Display: `Iowan Old Style`, `Songti SC`, `STSong`, Georgia, serif
- Body: Inter where available, then system sans-serif
- Page title: 44-56px desktop, 34-40px mobile; normal serif weight; no negative tracking
- Question heading: 20-24px, serif or restrained sans-serif semibold
- Labels: 12-14px, sans-serif, uppercase only for short progress labels
- Body: 14-16px, 1.55-1.7 line height

### Spacing And Layout

- Base unit: 8px
- Reading container: 760-840px
- Header container: up to 1120px
- Question sections: 48-64px vertical rhythm with thin separators
- Form control radius: 10-12px for the single primary field/action; 6-8px for compact selections
- No decorative shadows on cards; allow one subtle focus glow on active form controls
- Avoid nested cards. Each question is an unframed document section.

## Components

### Header

- Near-white background with a fine bottom rule
- Wordmark in compact serif, step count on the right
- Four-step navigation rendered as a thin progress line with one warm-orange active marker

### Primary Text Input

- 56px height, warm-orange focus border, minimal surface
- Label sits above or in a short left column on desktop

### Choice Control

- Flat bordered tiles, no heavy shadows
- Selected tile uses warm ivory fill, orange border and a small filled indicator
- Keep copy concise and left aligned

### Channel Range

- One row per channel: name on the left, live percent on the right, range track below
- Neutral track, warm-orange fill and circular thumb
- Total percentage is pinned to the section heading and changes color when valid

### Primary CTA

- Dark chocolate background with white text
- 56px height and 10-12px radius
- Full width on mobile, aligned right or full width inside the narrow document on desktop

## Page Patterns

- One main page title only, then numbered questions
- Objective facts first, user priority last
- Use a progressive document rhythm rather than a dashboard grid
- Desktop may use two columns inside a question; mobile collapses to one
- Keep all interactions native and legible for real screen recording

## Content Style

- Direct, specific and calm
- No explanatory subtitles or marketing copy inside the product flow
- Use observable facts and concrete operating problems

## Agent Build Instructions

- Redesign the existing diagnosis page only within the shared product shell; carry the same tokens into later screens so the experience is visually unified.
- Preserve the four-step flow and all confirmed business behavior.
- Use native radio buttons and range inputs with custom visual states; do not replace semantic controls with div-only interactions.
- Ensure the range value is always visible and the six channels must total 95%-105% before submission.
- Do not copy The Living Library logo, text, book suggestions or trademarked imagery.

## Rerun Inputs

workflow: firecrawl-website-design-clone
source_url: https://thelivinglibrary.app/
target_stack: vanilla HTML/CSS/JavaScript
output: DESIGN.md
