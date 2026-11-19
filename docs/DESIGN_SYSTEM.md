# PropDesk design system (signed-in app)

The look and behaviour of every screen after sign-in. The public landing page
(`src/components/landing/`) is marketing and keeps its scroll animations; the
app shares its palette and font but is calm and fast.

**Direction:** Mercury's calm, editorial look with Attio's record pages and
Stripe's tables. Black and warm grey, lots of white space, one primary action
per screen, colour only for meaning, photos of homes wherever a home appears.

**Reference screen:** [`docs/design/today-dashboard.dc.html`](design/today-dashboard.dc.html)
is the approved mockup of the Today page (organisation owner, desktop). Its
markup and the `renderVals()` data show the exact layout, sizes and colours.
Build the real page to match it, and use it as the pattern for other pages.

## 1. Tokens

Put these in `src/app/globals.css` as CSS variables (mapped onto the existing
shadcn variables where they overlap) and use Tailwind classes that read them.
Never hard-code a new colour in a component.

| Token          | Value                  | Use                                                      |
| -------------- | ---------------------- | -------------------------------------------------------- |
| `--pd-canvas`  | `#F6F5F3`              | App background behind cards                              |
| `--pd-surface` | `#FFFFFF`              | Cards, sidebar, tables, dialogs                          |
| `--pd-subtle`  | `#F5F5F4`              | Search box, tab track, avatar backgrounds, skeletons     |
| `--pd-border`  | `#E7E5E4`              | Card and input borders                                   |
| `--pd-divider` | `#F0EFED`              | Lines between rows inside a card                         |
| `--pd-ink`     | `#0A0A0A`              | Text, primary buttons, active nav item, progress bars    |
| `--pd-ink-2`   | `#44403C`              | Secondary text in tables                                 |
| `--pd-muted`   | `#57534E`              | Labels, captions (darkest grey allowed for 12–13px text) |
| `--pd-good`    | `#047857` on `#ECFDF5` | Paid, fully let, money left over                         |
| `--pd-bad`     | `#B91C1C` on `#FEF2F2` | Late, urgent, losing money                               |
| `--pd-warn`    | `#B45309` on `#FFFBEB` | Due, empty room                                          |
| `--pd-info`    | `#1D4ED8` on `#EFF6FF` | Part paid, tenancy ending, information                   |
| `--pd-orange`  | `#C2410C` on `#FFF7ED` | High priority repair                                     |

Dark mode: not now.

**Type:** Geist (load with `next/font/google`), `font-variant-numeric:
tabular-nums` for every money and count.

| Style         | Size / weight / tracking               |
| ------------- | -------------------------------------- |
| Page title    | 36px / 600 / -0.035em (28px on phones) |
| Section title | 20px / 600 / -0.02em                   |
| Big figure    | 30px / 600 / -0.03em                   |
| Body          | 15–16px / 400–500                      |
| Table text    | 14px                                   |
| Caption       | 13px, `--pd-muted`                     |
| Eyebrow       | 11px / 600 / uppercase / 0.06em        |

**Shape and space:** 4px grid. Radius 10px (buttons, inputs, nav items), 12px
(search, small cards), 16px (stat cards), 20px (section cards), 999px (pills).
Page padding 32px desktop, 16px phone; 24px between cards, 16px inside lists.
Touch targets at least 44px (40px for compact table actions on desktop only).
Shadows: none on cards (borders instead); a soft shadow only for menus,
dialogs and the selected tab.

## 2. App shell

- **Sidebar** (≥1024px, 248px, white, right border):
  logo; organisation switcher (name + account type, opens a menu of the user's
  organisations); groups with uppercase eyebrows:
  - Today
  - **Portfolio:** Properties, Owners, Tenants, Tenancies
  - **Money:** Rent, Reports
  - **Work:** Repairs, Contractors
  - **Account:** Settings
    Each item: 18px stroke icon, label, optional count pill (grey) or alert pill
    (red, e.g. "1 late"). Active item: black background, white text. Bottom: the
    signed-in person (initials, name, role).
- **Top bar:** search box ("Search homes, tenants, owners…", ⌘K / Ctrl K
  opens it from anywhere), notifications bell (dot when something needs
  attention), black **+ New** button opening a menu (Property, Tenant, Owner,
  Payment, Repair, Contractor).
- **Phones (<1024px):** top bar with logo, search icon and + New; a bottom bar
  with Today, Properties, Rent, Repairs, More (More opens the rest of the
  menu). Lists become cards. Nothing scrolls sideways except wide tables
  inside their own box.
- Content max width 1240px, left-aligned beside the sidebar.

## 3. Page templates

Build these once in `src/components/app/` and use them everywhere. Do not hand
roll a page layout.

1. **Today (dashboard).** Date line, greeting with the person's first name,
   one sentence on how many things need them. Then: four stat cards; **Needs
   you** (late rent, urgent repairs, tenancies ending within 60 days, rooms
   empty for 2+ weeks, each with one action button); **Your homes** (photo
   cards with a status chip); **Rent this month** (table with filter tabs All /
   Late / Still due / Paid and "Mark as paid"); **Open repairs**; **Recent
   activity** (from `audit_log`, no personal data). Empty organisation: a
   friendly first-steps card instead ("Add your first property").
2. **List page.** Title and count; primary action on the right; filter tabs
   (e.g. All / Let / Empty / Archived) and a search box; then a table on
   desktop, cards on phones; pagination at the bottom; sortable headings as
   links. Clicking a row opens the record. An empty state explains what the
   list is for and offers the add action.
3. **Record page** (property, owner, tenant, tenancy, repair, contractor).
   Back link; header with photo (properties) or initials avatar, name, key
   facts as chips (e.g. "Let by the room · 5 rooms"), and actions (Edit,
   more menu); a row of stat cards where useful; **tabs** (e.g. Overview,
   Tenancies, Rent, Repairs, Photos, History); a right-hand column on desktop
   for contact details and links; **History** tab is the activity timeline.
4. **Form page or sheet.** Narrow (max 560px) single column, one question per
   field, labels above inputs, help text under, errors in red under the field,
   Save (black) and Cancel (outline) at the bottom. Long creations are short
   steps (as the tenant wizard already does). Quick edits open in a side sheet
   on desktop and a full screen on phones.

## 4. Components

Stat card, section card, status pill, count pill, priority badge, filter tabs
(segmented control), data table (with sticky header and row hover), record
header, tabs, activity timeline, empty state (icon in a soft circle, one line,
one button), photo card, avatar (initials), side sheet, confirm dialog (only for
actions that cannot be undone), toast with Undo for archive and remove.

Status words, always these and always the same colours: **Paid** (good),
**Part paid** (info), **Due** (warn), **Late** (bad); repairs **New**,
**Assigned**, **In progress**, **Awaiting parts**, **Resolved**, **Cancelled**;
priorities **Urgent** (bad), **High** (orange), **Normal** (grey), **Low**
(grey outline); homes **Fully let**, **1 room empty**, **Empty**, **Archived**.

## 5. Words, numbers and dates

- Plain English: "home" in sentences ("Add a home"), "Properties" as the menu
  name; "Repairs" in the menu for maintenance; "tenant", "owner", "rent".
- Money: `£1,150` (whole pounds when exact, otherwise `£525.50`).
- Dates: `DD/MM/YYYY` in tables, forms and records; a short "5 Nov" only inside
  sentences and the Today page; relative times ("2 days ago") only in activity.
- Every number on the Today page must come from the database and match the
  lists it summarises.

## 6. Motion

Quiet and quick: 150–200ms fades and slides for menus, sheets, tabs and
toasts; numbers may count up once on first load; skeletons while loading. No
scroll-driven effects inside the app. Everything respects
`prefers-reduced-motion`.

## 7. Accessibility

WCAG 2.2 AA: 4.5:1 text contrast (use `--pd-muted` or darker for small
grey text), visible focus ring on everything, real buttons and links, labels on
every input, `aria-label` on icon-only buttons, tables with header cells, status
never shown by colour alone (always the word too), keyboard access to menus,
sheets, tabs and ⌘K search.

## 8. Roles in the interface

Show only the actions a role can take, but always enforce them on the server
and in RLS too. Staff do not see Settings › Members, Data export or Billing.
The person's role shows under their name in the sidebar.
