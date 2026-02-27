# Phase 1: Foundation - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema, auth (email/password signup, login, logout, password reset, session management, GDPR consent recording), and user preferences (freeform topic entry, delivery time). Everything downstream depends on this. The full preferences management UI (editing topics post-signup) is Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Signup & Onboarding Flow
- Topics and delivery time are collected during signup — user is fully set up before reaching the app
- Step-by-step flow: Screen 1 (email/password) → Screen 2 (pick topics) → Screen 3 (set delivery time)
- After completing signup: show a confirmation screen ("You're all set — your first Brief arrives at [time]") summarising their topics
- Email verification is required before any briefing is sent — unverified users are signed up but no briefings dispatch until the email link is clicked

### Topic Entry UX
- Tag/chip input: user types a topic, presses Enter or comma, it becomes a removable chip
- No minimum or maximum topic count — user can add as many as they like
- Suggestions appear as they type (dropdown) to help with consistency (e.g. "AI" vs "Artificial Intelligence"), but user can still add any freeform topic
- Data model must support adjacent topic suggestions for Phase 6 (PREF-04)

### Delivery Time
- Time picker with browser timezone auto-detected and displayed clearly for user confirmation
- User sees their chosen time alongside their timezone (e.g. "8:00am — Europe/London")

### Session Behaviour
- Sessions last 30 days rolling — timer resets on each visit
- Multiple devices can be active simultaneously — new login does not invalidate existing sessions
- On session expiry mid-browse: redirect to login page, then redirect back to the page they were on after re-auth

### Auth Error Handling
- Wrong password: vague message — "Email or password is incorrect" (does not confirm email existence)
- Duplicate email on signup: "An account with this email exists — log in?" with direct link to login
- Rate limiting: soft lock after 5 failed login attempts — 30-second cooldown before next attempt (no account lock)
- Password reset link expires after 1 hour

### Claude's Discretion
- Exact password strength requirements (minimum length, complexity)
- Loading/transition animations between onboarding steps
- Specific colour/style of error states
- Email verification reminder UX (resend link timing/presentation)

</decisions>

<specifics>
## Specific Ideas

- The onboarding step for topic entry should feel lightweight and fast — not a chore. Tag chips are the right pattern.
- Adjacent topic suggestions are important to the product vision; Phase 1 must lay the data model groundwork for this even though the UI arrives in Phase 6.

</specifics>

<deferred>
## Deferred Ideas

- Adjacent/related topic suggestions UI — Phase 6 (PREF-04)
- OAuth login (Google, GitHub) — v2 backlog
- "Remember me" toggle — session is always 30 days rolling, explicit toggle not needed

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-27*
