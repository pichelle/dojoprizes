# Product Requirements Document: DojoPrizes

**Status:** Draft v1 (living document, tracked alongside the app in this repo)
**Owner:** Michelle
**Location:** Code Ninjas Yorba Linda

*Originally named "Digital Prize Bin" in early planning; the shipped app is called DojoPrizes.*

---

## 1. Overview

Code Ninjas [location] runs a prize program for students ages 5–14. Students earn coins (Silver, Gold, Obsidian) and redeem them for 3D-printed prizes — Pokémon, Hello Kitty, Minecraft, and custom designs sourced from MakerWorld. Today, this program is managed entirely physically: prizes sit on small clear shelves, and requests for out-of-stock or custom prints are tracked verbally and remembered (or forgotten) by staff.

DojoPrizes is an internal, staff-facing web app that gives the front desk a single source of truth for prize inventory and student requests, and surfaces basic demand data to guide printing and restocking decisions.

## 2. Problem Statement

Code Ninjas [location] staff currently manage the prize shelf with no digital system:

- **Inventory visibility:** Physical shelf space is limited, and staff can't check stock or details without walking over and looking.
- **Request tracking:** Requests are captured verbally and jotted down ad hoc, with no shared or persistent record — requests get lost or forgotten, and there's no way to know what's still outstanding.
- **No demand data:** There's no way to see which franchises, themes, sizes, or coin tiers are actually popular, so printing and restocking decisions aren't data-informed.
- **Quiet stockouts:** Popular prizes often sell out without ever generating a formal request — students just take them off the shelf — so by the time staff notice a prize is gone, there's no record of demand to justify reprinting it quickly.

why its important:

- keeps student motivation high, making it easier for the student, parent, and teacher
- parents students feel their requests are valued, and not forgotten

what we did not do:

- considered making the coins digital too, as students may lose them or have too many to track. we did not go with this idea because the students love the physical coins— they can tangibly feel their rewards and gives them ownership of their coins— rather than having to access it by their parents digitally

## 3. Goals

- Give staff a fast, reliable way to see current prize inventory at a glance.
- Give staff a shared, persistent log of student prize requests so nothing gets lost.
- Surface basic analytics on prize popularity (by franchise, tag, coin tier) to inform what gets printed/restocked.

### Non-goals (for MVP)

- Student or parent self-service / kiosk mode
- Mobile app
- Tracking coin payment amounts or student coin balances
- Integration with MakerWorld for automatic print-file syncing (manual link entry; the app does best-effort auto-fetch of a preview image from the link, see 5.1)
- Individual staff login/permissions
- student votes for what next??

## 4. Users

- **Primary user:** Front desk / admin staff (2 people initially, including PM/owner)
- **Access model:** Single shared login for MVP; individual accounts may be considered later if more staff are onboarded.

## 5. MVP Scope

### 5.1 Prize Catalog

Staff can add, edit, and view prizes with:

- Photo (staff can paste a photo URL, or auto-fetch a preview image from the MakerWorld link)
- Name
- Franchise/category (Pokémon, Hello Kitty, Minecraft, custom, etc.)
- Coin tier (Silver / Gold / Obsidian)
- Listed price in Silver-equivalent coins, shown on the catalog card as a denomination breakdown (e.g. "1 Obsidian, 1 Gold") — tracking only, not used in any calculation, so staff can catch cases where something sold for a different price than intended
- Print source (MakerWorld link/design name — manual entry)
- Stock count
- Status (in stock / low stock / out of stock / print-on-request only)
- Linked filament colors (many-to-many, see 5.5)

The catalog page shows 3 top-line stats (total prizes, total checked out all-time, most popular franchise by checkout count) and can be filtered by theme/franchise, filament color, and status, and sorted by price. Clicking anywhere on a prize card opens it for editing; checkout stays a one-click action on the card itself.

*(Originally spec'd with a free-text "tags" field for color/theme — removed once franchise + filament-color linking covered that need.)*

### 5.2 Request Log

Staff can log a new prize request in seconds:

- Student name
- Prize requested (link to catalog item, or free text if not yet catalogued)
- Franchise, size (Small/Medium/Large/X-Large), color requested (pulled from the Filament Inventory list)
- Reference/idea links (multi-line)
- Date requested
- Status: Pending → Printed → Fulfilled (or Cancelled)
- Optional notes

This replaces the current verbal/ad hoc tracking with one running, shared list staff can check and update. The page shows 3 top-line stats (pending count, fulfilled all-time, most requested franchise) and can be filtered by status, theme/franchise, and color, and sorted by the linked prize's price.

### 5.3 Checkout Tracking

Separate from requests, staff can mark a prize as **checked out** (i.e., actually taken/purchased off the shelf) in one click:

- Prize (link to catalog item)
- Date checked out

No coin amount, payment detail, or per-student balance is tracked — this is intentionally lightweight. The purpose is purely to capture *actual demand* (what leaves the shelf), separate from *expressed demand* (what students explicitly request). This matters because popular grab-and-go prizes often run out without ever generating a request — checkout data is what tells staff a prize needs reprinting even when the request log is quiet.

### 5.4 Coin Tier System

Coin tiers follow a fixed conversion:

- 5 Silver = 1 Gold
- 5 Gold = 1 Obsidian

Internally, prize values are stored as a Silver-equivalent base unit for consistent sorting/filtering/reporting, while staff always see the familiar Silver/Gold/Obsidian labels in the UI.

### 5.5 Filament Inventory

A simple, standalone-but-linked inventory of filament colors/spools, separate from the Prize catalog:

- Color name (e.g., "Obsidian Black," "Sakura Pink")
- Material type (PLA, PETG, etc. — optional, keep flexible)
- Stock level (spools or estimated % remaining — staff's choice of unit)
- Low-stock flag/threshold
- Linked prizes: which prizes use this filament color, so staff can see "if I run low on this color, which prizes are affected" and vice versa — "what colors does this prize need before I can print more"
- Usage count per color (how many prizes use it), sortable most-to-least used, to help prioritize restocking

This is a many-to-many relationship: one prize can use multiple filament colors, and one filament color can be used across many prizes.

### 5.6 Staff access

Single shared password gate (no individual accounts for MVP — see 8 for the future-accounts idea).

### 5.7 Dashboard / Analytics

Partially built: top-line stat cards live directly on the Catalog and Request Log pages (5.1, 5.2) rather than a separate dashboard page. Not yet built:

- Low-stock flags cross-referencing filament colors with which prizes they'd block
- Basic trends over time (weekly/monthly checkout and request volume by category)
- A dedicated dashboard page combining all of the above in one view

## 6. Data Model (draft)

**Prize**

- id, name, photo_url, franchise, coin_tier (enum: silver/gold/obsidian), coin_value_silver_equivalent, coin_price (Silver-equivalent, tracking only), makerworld_link (manual text field, no API integration for MVP), stock_count, status

**Request**

- id, student_name, prize_id (nullable if not catalogued), free_text_prize (nullable), franchise, size (enum: small/medium/large/xlarge), color_filament_id (nullable, references Filament), links (multi-line text), date_requested, status (enum: pending/printed/fulfilled/cancelled), notes

**Checkout**

- id, prize_id, date_checked_out
- Intentionally minimal — no student identity, coin amount, or payment data required. Purpose is purely aggregate popularity tracking.

**Filament**

- id, color_name, material_type (optional), stock_level, low_stock_threshold

**PrizeFilament** (join table for the many-to-many link)

- prize_id, filament_id

## 7. Success Metrics

- Staff report requests are no longer being lost or forgotten (qualitative check-in after 2–4 weeks of use)
- Time to check current stock of a given prize drops (staff can look it up in-app instead of walking to the shelf)
- At least one printing/restocking decision made using the analytics dashboard within first month

## 8. Open Questions / Future Considerations

- Should regular (non-admin) staff eventually get access, and if so, individual logins or continued shared login?
- **When individual staff accounts are added, track which staff member added each prize** (and ideally each request/checkout/filament entry too) — an audit trail of who did what, not just what changed.
- Is there appetite later for coin redemption tracking, even in a lightweight form (e.g., manual "X coins spent" field per request rather than full balance tracking)?
- Should the catalog eventually pull print files/thumbnails directly from MakerWorld links? (Partially addressed — the app now does a best-effort auto-fetch of a preview image from the link, though this isn't a real MakerWorld API integration.)
- Kiosk/self-service mode for students — worth revisiting once MVP is validated?
- A real "fulfilled this week/month" stat needs a timestamp for when a request's status changes to Fulfilled (not just date_requested) — worth adding if that trend becomes useful.
- Replace the Silver/Gold/Obsidian text labels with hand-drawn coin icon illustrations once Michelle draws them.
- Prize Catalog: surface "date added" (already stored as `created_at`) as a visible sort/filter option, so staff can find the prizes that have been sitting in the catalog longest.

---

*This is a living document — scope decisions above (shared login, staff-only, no redemption tracking) reflect MVP priorities and may be revisited as the tool proves out.*
