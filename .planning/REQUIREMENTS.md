# Requirements: Brief

**Defined:** 2026-02-27
**Core Value:** A person picks their interests once, and every day at their chosen time, Brief delivers everything they need to know — without toxicity, ads, or algorithmic manipulation.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User session persists across browser refresh
- [x] **AUTH-03**: User can log in with email and password
- [x] **AUTH-04**: User can reset password via email link
- [x] **AUTH-05**: User can log out from any page
- [x] **AUTH-06**: Consent timestamp and IP are recorded at signup (GDPR)
- [x] **AUTH-07**: User can unsubscribe via one-click link with immediate processing (CAN-SPAM/GDPR)

### Preferences

- [x] **PREF-01**: User can enter freeform topics of interest (e.g. "Formula 1", "AI policy", "UK housing market")
- [x] **PREF-02**: User can set a daily delivery time for their briefing
- [ ] **PREF-03**: User can update topics and delivery time at any time from the web app
- [ ] **PREF-04**: Brief suggests adjacent topics based on a user's existing selections

### Content Pipeline

- [x] **CONT-01**: System ingests articles from curated RSS feeds mapped to user topics
- [x] **CONT-02**: System pulls articles from NewsAPI and Guardian API for user topics
- [x] **CONT-03**: AI (Claude Haiku) summarises and composes a personalised prose briefing from ingested articles
- [x] **CONT-04**: Every briefing item displays the source name and links to the original article

### Email Delivery

- [x] **MAIL-01**: User receives a daily HTML email briefing at their chosen delivery time
- [x] **MAIL-02**: Email domain is configured with SPF, DKIM, and DMARC before first send
- [x] **MAIL-03**: Bounce and complaint events are handled automatically via webhooks
- [x] **MAIL-04**: Every email includes a plain text alternative

### Web App

- [ ] **WEB-01**: User can read today's briefing via the web app
- [ ] **WEB-02**: User can browse past briefings in an archive
- [ ] **WEB-03**: User can manage topics, delivery time, and account details from a settings page
- [ ] **WEB-04**: A public landing page explains Brief and captures beta signup interest

## v2 Requirements

### Monetisation

- **MON-01**: User can subscribe to a paid plan
- **MON-02**: Free tier is gated to a limited number of topics or days
- **MON-03**: Paid tier unlocks unlimited topics and full archive

### Auth

- **AUTH-08**: User can log in with Google OAuth
- **AUTH-09**: User can log in with GitHub OAuth

### Notifications

- **NOTF-01**: User can receive a weekly digest instead of daily
- **NOTF-02**: User receives a re-engagement email if they haven't opened in 7 days

## Out of Scope

| Feature | Reason |
|---------|--------|
| X/Twitter API integration | Cost ($100-$5k/month), unreliable, conflicts with anti-toxicity goal |
| Mobile app | Web-first for PoC; mobile is a post-validation investment |
| Real-time push notifications | Daily digest is the core format |
| Algorithmic feed / infinite scroll | Explicitly anti-pattern to Brief's purpose |
| User-generated content / comments | Out of scope for briefing product |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 2 | Complete |
| PREF-01 | Phase 1 | Complete |
| PREF-02 | Phase 1 | Complete |
| PREF-03 | Phase 6 | Pending |
| PREF-04 | Phase 6 | Pending |
| CONT-01 | Phase 3 | Complete |
| CONT-02 | Phase 3 | Complete |
| CONT-03 | Phase 4 | Complete |
| CONT-04 | Phase 3 | Complete |
| MAIL-01 | Phase 5 | Complete |
| MAIL-02 | Phase 2 | Complete |
| MAIL-03 | Phase 2 | Complete |
| MAIL-04 | Phase 2 | Complete |
| WEB-01 | Phase 6 | Pending |
| WEB-02 | Phase 6 | Pending |
| WEB-03 | Phase 6 | Pending |
| WEB-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation*
