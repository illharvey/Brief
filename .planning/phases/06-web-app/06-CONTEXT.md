# Phase 6: Web App - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Briefing viewer (read today's and past briefings in the web app), 14-day archive, adjacent topic suggestions surfaced within the briefing view, and a public marketing landing page. Settings were delivered in Phase 5.1 and are out of scope here.

</domain>

<decisions>
## Implementation Decisions

### Briefing viewer
- Content is divided into distinct topic sections with clear headers (e.g. "AI", "Finance", "Sport") — not continuous prose or card-per-topic
- Source attribution links are inline within the summary text — woven into prose, not listed separately at the bottom
- Briefing header shows: date + a one-line editorial headline summarising the day (not just a date, not full stats)
- When today's briefing hasn't been generated yet: show a "Your briefing is on the way" placeholder with a link to yesterday's briefing below it

### Archive / Briefings list
- The "Briefings" nav link IS the archive — a reverse-chronological list of all 14 days, with today's briefing pinned at the top as the current entry
- No separate "Archive" link in the sidebar; no calendar view
- Each row in the list shows: date + editorial headline only (no topic pills, no source count)
- Empty state for new users: "Your first briefing arrives tomorrow" message, with delivery time shown

### Topic suggestions
- Suggestions appear below the briefing content — after all topic sections, at the bottom of the reader view
- Logic: hardcoded topic graph — predefined adjacency relationships (e.g. "if you follow AI, suggest: Machine Learning, Robotics, Tech Policy"). No collaborative filtering or ML for v1.
- When a user clicks "Add" on a suggestion: topic is added immediately in-place with a "Topic added" toast — no navigation to Settings
- Suggestion pill becomes a checkmark or disappears after adding

### Public landing page
- Exact design from the reference HTML provided in discussion (see Specific Ideas below)
- Lives at the root URL `/`; logged-in users are redirected to `/dashboard`
- Primary CTA: email input + button — clicking carries the email to `/signup?email=...` so the signup form is pre-filled
- Sign up directly — no waitlist, no gating

### Claude's Discretion
- Exact topic graph adjacency relationships (which topics suggest which others)
- Loading skeleton design for the briefing viewer
- Error states (failed to load briefing, failed to add topic)
- Exact typography scale and spacing within the briefing viewer sections
- How many suggestion pills to show at once (3-5 is reasonable)

</decisions>

<specifics>
## Specific Ideas

### Landing page reference
The user provided a complete HTML/CSS reference for the landing page. Key elements to reproduce faithfully:

**Structure (in order):**
1. Fixed nav — "Brief." logo (Playfair 900, espresso, beeswax period) + links (How it works, Topics, Sign up) + "Get started" CTA button
2. Hero — two-column grid: left (eyebrow "The antidote to doomscrolling", h1 "News that *matters to you.* Nothing else.", Libre Baskerville subtitle, email input + "Get Brief." button, social proof row with 4 avatars + "2,400+ readers already in the know")  right (phone mockup rotated 2°, showing a Brief. app screen with topic pills and two brief cards)
3. Ticker — espresso background, scrolling marquee: "No doomscrolling ✦ Curated just for you ✦ Fresh every morning ✦ 100+ topics available ✦ No algorithms. No noise. ✦ Just what matters"
4. How it works — cream background, 3-step grid: "01 Pick your topics / 02 We do the reading / 03 Your brief arrives"
5. Topics grid — card grid with emoji + topic name + source count (12 topics shown: Climate, Technology, Finance, Design, Politics, Science, Culture, Sport, Health, Space, Food, Travel)
6. Quote section — espresso background, centered italic testimonial: *"I used to doomscroll for an hour every morning..."* — Early reader, London
7. Bottom signup CTA — beeswax-pale background, centered heading, email input + "Start Reading" button, "Free to start. No credit card. No noise." note
8. Footer — espresso background, Brief. logo + tagline, links (About, Topics, Privacy, Terms, Contact), copyright

**Typography:** Playfair Display (headings, logo), Libre Baskerville (editorial body/subtitle), DM Sans (UI, nav, forms)

**Colors:** Already in globals.css — milk background, espresso text, beeswax accent, warm-brown secondary, cream section background, beeswax-pale CTA section background

**Animations:** fadeUp on hero elements (staggered 0.1s–0.7s delays), phone mockup fadeIn, CSS ticker animation

**Responsive:** Nav links hidden on mobile, hero goes single column, padding tightens

**CTA wiring:** Email input value carried to `/signup?email=encodeURIComponent(value)` on form submit/button click

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-web-app*
*Context gathered: 2026-03-06*
