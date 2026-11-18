# PPESO CLIENT ATTENDANCE — Design System Agent

> **Purpose**: This document is the authoritative reference for the PPESO Client Attendance visual design system.
> Any AI agent creating or modifying UI must follow these rules to maintain visual consistency.

---

## 1. Design Philosophy & UI/UX Core Principles

PPESO Client Attendance is an **internal government office tool** for the Provincial PESO of Agusan del Sur.
The design must be:

- **Professional & trustworthy** — befitting a government LGU system
- **Fast to operate** — staff log walk-ins and check DTRs many times a day; the kiosk is used by everyone at the door
- **Role-aware** — Admin, Supervisor and Beneficiary share one design system with separate layouts
- **Dark-mode native** — every component must work in both light and dark themes

### 1.1 UI/UX Guiding Principles

| Principle                   | Meaning |
| --------------------------- | ------- |
| **Visual hierarchy**        | The most important element is the most prominent. Use size, weight and contrast — not icons or color quantity. |
| **Whitespace is structure** | Generous spacing between groups creates scannable sections. |
| **Reduce cognitive load**   | Show only what the user needs at each step. Hide detail behind `Dialog`, `Sheet` or `Collapsible`. |
| **Consistency over creativity** | Similar actions look and behave the same on every screen and role. |
| **Text communicates, decoration does not** | Labels and headings carry meaning. Decorative icons and colored badges for non-status info add noise. |
| **Feedback is immediate**   | Every click, submit or delete shows visible feedback within 100ms: disabled button, spinner, `Skeleton`. |
| **Content density must be intentional** | Dense tables and dashboards are fine. Dense forms and dialogs are not. |
| **The kiosk is for everyone** | Large touch targets, large passcode digits, one clear result message per punch. |

> [!CAUTION]
> **Before adding ANY visual element** (icon, badge, border, color, shadow, animation), ask:
> 1. Does this help the user **complete their task faster**?
> 2. Does this **communicate information** not already conveyed by text or layout?
> 3. If I removed this, would the user **lose any understanding**?
>
> If the answer to all three is "no", **do not add it**.

---

## 2. Color System — oklch Design Tokens

All colors are CSS custom properties in `oklch()` in [`src/style.css`](../src/style.css) (shadcn-vue `neutral` base).

### Light Mode (`:root`)

| Token                  | oklch Value                  | Purpose |
| ---------------------- | ---------------------------- | ------- |
| `--background`         | `oklch(1 0 0)`               | Page background |
| `--foreground`         | `oklch(0.145 0 0)`           | Primary text |
| `--card`               | `oklch(1 0 0)`               | Card surface |
| `--primary`            | `oklch(0.205 0 0)`           | Primary buttons (near-black) |
| `--primary-foreground` | `oklch(0.985 0 0)`           | Text on primary |
| `--secondary` / `--muted` / `--accent` | `oklch(0.97 0 0)` | Subtle surfaces |
| `--muted-foreground`   | `oklch(0.556 0 0)`           | Secondary / hint text |
| `--destructive`        | `oklch(0.577 0.245 27.325)`  | Errors, delete, Absent |
| `--border` / `--input` | `oklch(0.922 0 0)`           | Borders, inputs |
| `--ring`               | `oklch(0.708 0 0)`           | Focus ring |
| `--chart-1` … `--chart-5` | orange, teal, slate blue, yellow, amber | Chart series |
| `--sidebar-*`          | neutral set                  | Sidebar-scoped colors |

### Dark Mode (`.dark`)

- `--background`: `oklch(0.145 0 0)`, `--card`: `oklch(0.205 0 0)`
- `--primary`: `oklch(0.922 0 0)` with dark `--primary-foreground`
- `--border`: `oklch(1 0 0 / 10%)`, `--input`: `oklch(1 0 0 / 15%)`
- `--destructive`: `oklch(0.704 0.191 22.216)`
- `--sidebar-primary`: `oklch(0.488 0.243 264.376)` (blue)

### Rules

> [!CAUTION]
> 1. **NEVER hard-code colors** like `bg-white`, `text-black`, `#333`, `rgb(...)`.
> 2. **ALWAYS use semantic tokens**: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`.
> 3. **NEVER use inline `style="color: ..."`.**
> 4. **Charts use `--chart-1` … `--chart-5`** (read them with `getComputedStyle(document.documentElement)` for chart.js).
> 5. **Status badges** use `bg-{token}/10 text-{token} border-{token}/30`. The project has no `--success` / `--warning` /
>    `--info` tokens yet, so punch-status badges (`getPunchStatusBadgeClass`) and office/user status badges still use raw
>    `emerald` / `amber` / `orange`. When you touch them, add `--success`, `--warning`, `--info` (light + dark) to
>    `style.css` and `@theme inline`, then switch the helpers. Until then, badge classes live **only** in the helpers —
>    never inline a raw palette color in a component.
> 6. **Sidebar uses** the dedicated `--sidebar-*` tokens.

> [!WARNING]
> `PesoDashboard.vue` charts still use raw `rgba(...)` / hex colors. Move them to chart tokens when touching it.

---

## 3. Typography

| Property         | Value |
| ---------------- | ----- |
| **Font Family**  | **Roboto** (`components.json` → `font: roboto`; imported from Google Fonts in `style.css`) |
| **Weights**      | 400, 500, 600, 700 |
| **Heading Font** | Same as body (`--font-heading: var(--font-sans)`) |

> [!WARNING]
> **Known bug**: `body` in `style.css` sets `font-family: 'Nunito Sans Variable', -apple-system, …, 'Segoe UI', Roboto, …`.
> Nunito Sans is never loaded, so Windows renders **Segoe UI** and macOS the system font — Roboto only appears on Android.
> When touching `style.css`, set `--font-sans: 'Roboto', ui-sans-serif, system-ui, sans-serif;` in `@theme inline` and
> use it for `body`.

### Rules

> [!IMPORTANT]
> 1. **DO NOT add or import other fonts.** Roboto is the project font.
> 2. Heading hierarchy uses real `<h1>`–`<h6>` tags — one `<h1>` per page.

### 3.1 Dates — Written Where Read, Numeric Where Compared — MANDATORY

> [!IMPORTANT]
> Pick the date format by how the date is used. These are the users' preferences.
>
> | Use a **written date** — `November 13, 2026` (with time `November 13, 2026 2:05 PM`; a period `November 1-15, 2026`) | Use a **numeric date** — `11/13/2026` (with time `11/13/2026 2:05 PM`) |
> | --- | --- |
> | The date is **read as text**: date / period columns in tables and lists, page & card descriptions, status lines ("Submitted …", "Reviewed …"), dialog summaries, report periods | The date is **compared or entered**: dense grids with many dates side by side (e.g. the DTR day grid), messages next to a date picker (match what was typed), validation errors |
> | Official printed documents follow their own form (see 4) | CSV / exported data and file names (ISO `yyyy-MM-dd` for file names) |
>
> When unsure, prefer the written date for anything a person reads once, and numeric for anything scanned or typed.
>
> 1. Use the shared helper `src/helpers/common/dateFormatHelper.ts`: written — `formatDisplayDateLong`,
>    `formatDisplayDateTimeLong`; numeric — `formatDisplayDate`, `formatDisplayDateTime`. Report periods use
>    `formatReportPeriod` / `formatPeriodRange` (`accomplishmentHelper.ts`). **Older helpers still render `Nov 13, 2026`**
>    via `toLocaleDateString('en-US', { month: 'short' })` — `formatDateDisplay` in `attendanceHelper.ts`,
>    `officeHelper.ts` and `userManagementHelper.ts`. Migrate them to the shared helper instead of adding another copy.
> 2. **Never** abbreviate month names (`Nov`) or use other orders (`13/11/2026`, `2026-11-13`) in the UI. Times alone
>    (`8:02 AM`), relative times and month headers on the DTR are not dates and stay as they are.
> 3. **Display only.** The database keeps `date` / `timestamptz`, payloads send ISO (`yyyy-MM-dd`), `<input type="date">`
>    values stay ISO, CSV file names keep `yyyy-MM-dd`.
> 4. **Official printed forms** (Civil Service Form 48 DTR in `DtrSlip.vue` / `dtrHelper.ts`, accomplishment reports in
>    `accomplishmentPrintHelper.ts`) follow the form's own layout.
> 5. Always format attendance dates from the stored `attendance_date` string as a local date — never `new Date('yyyy-mm-dd')`,
>    which parses as UTC and can shift the day.
> 6. Written dates are plain text — don't put them in `font-mono`; keep `whitespace-nowrap` in table cells.
>
> Applied so far: Accomplishment tables (beneficiary My Reports, admin / supervisor review), My Attendance dates.

---

## 4. Border Radius System

| Tailwind Class | CSS Variable                              | Value |
| -------------- | ----------------------------------------- | ----- |
| `rounded-sm`   | `--radius-sm: calc(var(--radius) - 4px)`  | 6px   |
| `rounded-md`   | `--radius-md: calc(var(--radius) - 2px)`  | 8px   |
| `rounded-lg`   | `--radius-lg: var(--radius)`              | 10px  |
| `rounded-xl`   | `--radius-xl: calc(var(--radius) + 4px)`  | 14px  |

Base `--radius` = `0.625rem`.

---

## 5. Component Library — shadcn-vue

### Configuration ([`components.json`](../components.json))

| Setting       | Value      |
| ------------- | ---------- |
| Style         | `new-york` |
| Font          | `roboto`   |
| Base color    | `neutral`  |
| Icon library  | `lucide`   |
| TypeScript    | `true`     |
| CSS Variables | `true`     |

### Installed Primitives (17)

`avatar` · `badge` · `button` · `card` · `collapsible` · `dialog` · `dropdown-menu` · `empty` · `input` · `label` ·
`native-select` · `separator` · `sheet` · `sidebar` · `skeleton` · `table` · `tooltip`

Not installed yet (add with the CLI when first needed): `checkbox`, `alert-dialog`, `select`/`combobox`, `sonner`,
`popover`, `calendar`, `textarea`, `switch`, `tabs`.

### Rules

> [!CAUTION]
> 1. **NEVER manually edit** files inside `src/components/ui/`.
> 2. Add primitives with `rtk npx shadcn-vue@latest add <component-name>`.
> 3. **DO NOT install** Vuetify, Element Plus, Quasar, PrimeVue, or any other component library.
> 4. Custom shared components live **outside** `ui/`, in role subdirectories.

### 5.1 Use Installed Primitives, Don't Create Wrappers

| UI Need                         | Use This                                 | ❌ Do NOT Create |
| ------------------------------- | ---------------------------------------- | ---------------- |
| Modal / confirmation            | `Dialog` (→ `AlertDialog` once installed) | `ConfirmModal.vue` |
| Side panel / long form          | `Sheet`                                  | `SidePanel.vue`  |
| Row action menu                 | `DropdownMenu`                           | `ActionMenu.vue` |
| Expandable content              | `Collapsible`                            | `ExpandSection.vue` |
| Tooltip                         | `Tooltip`                                | `InfoPopup.vue`  |
| Loading placeholder             | `Skeleton`                               | `LoadingPlaceholder.vue` |
| Empty state                     | `Empty` / `TableEmpty`                   | `NoDataFound.vue` |
| Single-choice dropdown          | `SearchSelect` (`src/components/common/SearchSelect.vue`; `:searchable="false"` for short fixed lists) | native `<select>`, new picker copies |

#### Add / Edit Forms — Dialog or Sheet?

A form goes in a `Sheet` when it has **more than 5 fields**, conditional fields, or scrolls at laptop height
(e.g. `ClientRecordSheet.vue`). Short forms and confirmations stay in a `Dialog`.

Sheet layout: fixed header, a body that scrolls on its own, a sticky footer with the actions:

```vue
<Sheet :open="isOpen" @update:open="onOpenChange">
  <SheetContent class="flex h-full flex-col p-0 sm:max-w-lg">
    <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
      <SheetTitle>Log Walk-in Client</SheetTitle>
    </SheetHeader>
    <form class="contents" @submit.prevent="save">
      <div class="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto px-6 py-4">
        <!-- fields -->
      </div>
      <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" @click="close">Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  </SheetContent>
</Sheet>
```

> [!CAUTION]
> 1. **DO NOT create `.vue` files that merely wrap a single primitive.** Compose primitives inline.
> 2. Extract a shared component only when the same pattern repeats in **3+ unrelated screens**.

---

## 6. Icons — Lucide Vue (Use Sparingly)

| Setting      | Value |
| ------------ | ----- |
| Package      | `@lucide/vue` |
| Default size | `class="size-4"` (or `h-3.5 w-3.5` in compact toolbars) |

| ✅ Use icons for                                 | ❌ Avoid icons on |
| ----------------------------------------------- | ---------------- |
| Sidebar navigation items                         | Every button in a group |
| Icon-only buttons (theme toggle, row actions)    | Dialog / sheet titles (except the destructive-dialog badge) |
| Status indicators alongside color                | Form labels and section headers |
| Empty states (one icon)                          | Every badge or list item |
| The primary toolbar action                        | Secondary / outline buttons |

> [!IMPORTANT]
> 1. **Lucide only.** Import icons individually.
> 2. Add `shrink-0` inside flex containers.
> 3. **Max 1 icon per button.** Icon-only buttons need a `title` or `aria-label`.

---

## 7. Layout Architecture

Every authenticated role uses the same shell ([`src/layouts/`](../src/layouts)):

```
┌──────────────────────────────────────────────────────────┐
│ SidebarProvider (default-open; state kept in a cookie)    │
│ ┌──────────────┬───────────────────────────────────────┐ │
│ │  RoleSidebar │  <main>                               │ │
│ │              │  ┌──────────────────────────────────┐ │ │
│ │              │  │ <header> sticky z-50 h-16         │ │ │
│ │              │  │  SidebarTrigger + page label      │ │ │
│ │              │  │  + theme toggle (ml-auto)         │ │ │
│ │              │  ├──────────────────────────────────┤ │ │
│ │              │  │ <RouterView/> (p-4 sm:p-6)        │ │ │
│ │              │  └──────────────────────────────────┘ │ │
│ └──────────────┴───────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

| Layout                       | Sidebar                  | Role |
| ---------------------------- | ------------------------ | ---- |
| `PesoLayout.vue`             | `PesoSidebar.vue`        | Admin |
| `SupervisorLayout.vue`       | `SupervisorSidebar.vue`  | Supervisor |
| `BeneficiaryLayout.vue`      | `BeneficiarySidebar.vue` | Beneficiary |
| `auth/AuthLayout.vue`        | _(none — public)_        | Login / Signup |

Header pattern:

```html
<header class="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/40
  px-3 sm:px-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-colors duration-200">
```

Page header pattern (inside a screen): `<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">` + one-line
`text-sm text-muted-foreground` description, with toolbar buttons (`size="sm"`) on the right that wrap on mobile.

---

## 8. Dark Mode

| Setting        | Value |
| -------------- | ----- |
| Implementation | `@vueuse/core` → `useColorMode()` |
| Variant        | `@custom-variant dark (&:is(.dark *))` |
| Toggle         | Button in each layout header |
| Persistence    | `localStorage` via `useColorMode()` |

> [!IMPORTANT]
> 1. **Every component must work in dark mode** — use tokens; add `dark:` overrides only when a token can't express it.
> 2. **Test both modes** for every new component.
> 3. **Dark-only pages** set `meta: { forceDark: true }` on their route (the login page, to match its MagicRings
>    background). `AuthLayout` (via `useAuthLayout`) then adds `dark` to its root and hides the theme toggle.

---

## 9. Animation

| Library            | Usage |
| ------------------ | ----- |
| `tw-animate-css`   | Enter/exit utilities used by shadcn-vue primitives |
| Vue `<transition>` | Element enter / leave inside a page (not around layout `<RouterView>`s, see below) |

> [!CAUTION]
> **No route transitions.** `App.vue` and `AuthLayout.vue` render a plain `<RouterView />`. They used to wrap it in
> `<transition name="fade" mode="out-in">` (one inside the other), which never animated (no `.fade-*` CSS existed)
> and left the dashboard **blank after login until a refresh**: with out-in, the next layout waits for the old one
> to finish leaving, and the nested transition re-rendering inside the leaving layout stalled it.
> Don't put `mode="out-in"` transitions around layout-level `<RouterView>`s again. Respect `prefers-reduced-motion`
> for any new animation. **Do not add new animation libraries.**

---

## 10. Responsive Design

| Breakpoint | Prefix      | Usage |
| ---------- | ----------- | ----- |
| Mobile     | _(default)_ | Single column, stacked toolbars |
| Small+     | `sm:`       | Side-by-side toolbars, `p-6` content |
| Medium+    | `md:`       | Multi-column grids |
| Large+     | `lg:`       | Full desktop layouts |

> [!IMPORTANT]
> 1. Mobile-first: default classes are for phones.
> 2. Content containers use `min-w-0` and `overflow-x-hidden`; wide tables scroll **inside** their card
>    (`relative overflow-x-auto`), never the page.
> 3. **Touch targets ≥ 40px** on mobile; the kiosk keypad larger.
> 4. Toolbars stack on mobile: `flex flex-col gap-2 sm:flex-row`, search `w-full sm:w-auto`.
> 5. Dialogs fit the screen: `max-h-[90vh] overflow-y-auto`; form grids collapse to one column (`grid gap-4 sm:grid-cols-2`).
> 6. Sheets go full width on phones (`sm:max-w-*` only) and keep the sticky footer.
> 7. Inputs stay at 16px text on phones (`text-base md:text-sm`) so iOS doesn't zoom; use `type="tel"` / `inputmode="numeric"`
>    for phone numbers and passcodes.
> 8. **Check every screen at 360px wide** — no horizontal page scroll, no clipped text.

---

## 11. Data Table Design

Tables use the shadcn-vue `<Table>` primitives. Search, filters, pagination and selection live in the **composable**
(e.g. `useAttendance.ts`); the component only renders.

- Loading: one full-width row with a spinner or `Skeleton` rows; empty: `<TableEmpty>` with an `Empty` state.
- `colspan` must match the real column count (including the select column).
- Row actions: icon buttons with `title`, or a `DropdownMenu` when there are more than three.
- Pagination: page-size selector + sliding window of 5 page numbers (`visiblePages`), reset to page 1 when filters change.
- CSV export goes through a helper (`exportXxxToCsv`) and exports the **filtered** rows.

### 11.1 Bulk Selection & Bulk Delete — MANDATORY

Every data table supports selecting multiple rows and deleting them in one action. Reference implementation:
**Attendance Records** (`Attendance.vue` + `useAttendance.ts` + `attendanceService.deleteAttendances`).

| Layer          | Requirement |
| -------------- | ----------- |
| **Composable** | `selectedIds: Ref<Set<string>>` (reassign a new `Set` on change); `isSelected`, `toggleSelect`, `toggleSelectPage`, `selectAllFiltered`, `clearSelection`; `isAllPageSelected`, `isPagePartiallySelected`, `selectedRecords`; a `watch` that **prunes the selection to the currently filtered rows**; `isBulkDeleteDialogOpen`, `isBulkDeleting`, `confirmBulkDelete`. |
| **Service**    | One request per 100 IDs: `.delete().in('id', chunk).select('id')`; returns the deleted IDs. |
| **Component**  | First column is a checkbox. Header checkbox toggles the **current page** and shows `indeterminate` for a partial page. Bulk bar shows **only** when something is selected. Bulk delete goes through a confirmation dialog. |

Checkbox: native `<input type="checkbox">` styled with `h-4 w-4 cursor-pointer rounded border-input accent-primary`
until the shadcn `checkbox` primitive is added — then switch to it.

Bulk action bar:

```vue
<div v-if="selectedCount > 0"
     class="flex flex-col gap-2 border-t bg-primary/5 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <span class="font-semibold text-foreground">{{ selectedCount }} selected</span>
    <button v-if="!isAllFilteredSelected" class="font-medium text-primary hover:underline" @click="selectAllFiltered">
      Select all {{ filtered.length }} matching records
    </button>
    <button class="text-muted-foreground hover:text-foreground" @click="clearSelection">Clear selection</button>
  </div>
  <Button variant="destructive" size="sm" :disabled="isBulkDeleting" @click="openBulkDeleteDialog">Delete selected</Button>
</div>
```

#### Rules

> [!CAUTION]
> 1. **Every data table has a select checkbox as its first column.**
> 2. **Bulk delete is confirmed** in a dialog that states the exact count and that it cannot be undone, and lists the
>    selected records (cap the list at 50 + "…and N more").
> 3. **The selection never includes hidden rows**: prune it when filters change; clear it after a successful delete.
> 4. **Report the real outcome**: "N records deleted", or "Deleted X of Y" when RLS skipped some. On failure, refetch.
> 5. **Disable** the bulk delete button and dialog actions while `isBulkDeleting`.
> 6. **Keep per-row delete**; bulk selection is in addition to it.
> 7. Checkbox clicks must not trigger row navigation (`@click.stop` if rows are clickable).
> 8. Only tables whose records must never be deleted are exempt — state the exemption in a comment.
>
> **Also compliant:** the Directory tab (`DirectoryTab.vue` + `useDirectory.ts`). **Still to bring into compliance:** Client Records, Offices tab, User Management.

---

## 12. Feedback & Notifications — Toasts, Top-Right

Every create / update / delete result shows as a **toast in the top-right corner** — never as a banner on the page.

- **Composable:** `useToastAlert()` (`src/composables/common/useToastAlert.ts`) — `success(text)`, `error(text)`,
  `show(text, type)`. One app-wide stack; toasts auto-dismiss after 4s, max 4 visible, each closable.
- **Component:** `ToastAlert.vue` (`src/components/common/`), mounted **once** in `App.vue` and teleported to `<body>`
  (`fixed top-4 right-4`, full width on phones). Success uses the emerald tones, errors `destructive`. Errors are
  `role="alert"`, successes `role="status"`.
- Page composables keep a local `showFeedback(text, type)` that calls `toast.show`; components never render feedback.

> [!IMPORTANT]
> 1. **Toasts are for the outcome of an action** (saved, deleted, failed). Form validation stays **inline** under the
>    field, and an error that keeps a dialog open (e.g. a duplicate code) stays **inside the dialog**.
> 2. Don't add `window.alert()` / `window.confirm()` or page-level banners.
> 3. Keep messages to one short sentence (§14.4).

---

## 12.1 Vue Files Contain Rendering Only — MANDATORY

A `.vue` file renders. Its `<script setup>` only:

- imports components, icons and **one** page composable (plus child components);
- declares `defineProps` / `defineEmits` / `defineModel` and passes them to the composable;
- destructures what the template needs;
- may hold **class-name constants** (e.g. `checkboxClass`) and a `COLUMN_COUNT` for `colspan`.

Everything else lives outside the component:

| Kind of code | Where it goes |
| ------------ | ------------- |
| State, `computed`, `watch`, lifecycle hooks, event handlers, router calls | Composable (`src/composables/<role>/useXxx.ts`) |
| Option lists, chart options, data builders, formatting, maths | Helper (`src/helpers/...`, pure functions) |
| Supabase / HTTP calls | Service (`src/services/...`) |
| Library setup (e.g. Chart.js registration) | `src/lib/` |

In the **template**, bind to names: no multi-statement handlers (`@click="() => { ... }"`), no `Math.*`, `.slice()`,
`.filter()`, `.map()`, `new Date()` or percentage / page-range arithmetic. Expose a computed or function from the
composable instead (e.g. `pageRange.start`, `bulkDeletePreview`, `editFromDetails`). Simple display formatting
(`count.toLocaleString()`, a ternary label) is fine. Template refs use `useTemplateRef('name')` inside the composable.
**Exception — vendored components:** `src/components/vuebits/` holds third-party visual effects copied from
Vue Bits (e.g. `MagicRings.vue`, needs `three`). Like `ui/`, don't edit them; configure them through props from a
composable, load them with `defineAsyncComponent` (keeps three.js out of the main bundle), and skip them when
`prefers-reduced-motion` is set. Use them on public pages only (see §15).
Shared pieces: `useLayoutHeader` / `useThemeToggle` (layouts), `paginationHelper` (`getPageRange`, `getVisiblePages`,
`toPercentage`), `useSearchSelect` (`SearchSelect.vue`).

---

## 13. Styling Rules — Summary

> [!CAUTION]
> 1. **NO `<style>` blocks** in `.vue` components — Tailwind utilities only. **Exception:** print layouts for official
>    forms (`DtrSlip.vue`, `DtrGenerator.vue`) may keep scoped print CSS. (`Login.vue` / `Signup.vue` also have `<style>`
>    blocks — move them to utilities when touched.)
> 2. **NO new CSS files.** Global styles go in `src/style.css`.
> 3. **NO inline styles** — except values that must be computed at runtime (e.g. chart sizing, the DTR diagonal slash).
> 4. **NO hardcoded colors** — use tokens.
> 5. **Always support dark mode.**
> 6. **Charts** use `chart.js` + `vue-chartjs` only. No second chart library.

---

## 14. UI/UX Rules — Strict Compliance

### 14.1 Visual Hierarchy

- Page title (`<h1>`): largest, boldest. One per view.
- Section headings: `font-semibold text-base` / `text-lg`.
- Body: `text-sm text-foreground`; secondary: `text-sm text-muted-foreground`; hints: `text-xs text-muted-foreground`.

### 14.2 Spacing & Density

| Context                 | Pattern |
| ----------------------- | ------- |
| Between page sections   | `gap-6` / `space-y-6` |
| Between cards in a grid | `gap-4` |
| Inside a `Card`         | `CardHeader` + `CardContent` |
| Between form fields     | `space-y-4` minimum |
| Inline label + value    | `flex justify-between` or `grid grid-cols-2` |

### 14.3 Loading & Feedback States

| State              | Implementation |
| ------------------ | -------------- |
| Page / table load  | `Skeleton` or a single centered `Loader2` row |
| Button submitting  | Disabled + `Loader2` spinning + gerund label ("Deleting...") |
| Empty result       | `Empty` / `TableEmpty` with one sentence and optional "Reset filters" / "Refresh" |
| Destructive action | Confirmation `Dialog` naming the consequence — never `window.confirm()` |
| Success / error    | Toast in the top-right (§12, `useToastAlert`) |

### 14.4 Microcopy — Short and On-Point

| Element                          | Limit |
| -------------------------------- | ----- |
| Page / card / dialog description | 1 sentence, ~15 words |
| Destructive confirmation         | 1 sentence: the consequence |
| Feedback message                 | 1 short sentence |
| Empty state                      | 1 sentence + optional action |
| Tooltip / `title`                | A few words |

No restating the title, no filler ("Here you can…"), no implementation details (RLS, schemas, caching).

### 14.5 Anti-Patterns — DO NOT DO THESE

| ❌ Anti-Pattern                                    | ✅ Correct Approach |
| -------------------------------------------------- | ------------------- |
| Icon on every label, heading and button             | Icons only where they add meaning (§6) |
| Colored badge for non-status metadata               | Badges for status / position values only |
| Custom-built modal component                        | Compose `Dialog` / `Sheet` inline |
| `window.confirm()` / `window.alert()`               | Confirmation `Dialog`, toast (§12) |
| Raw `bg-emerald-500/10` in a component              | Badge class from a helper, token-based (§2) |
| `<style scoped>` for one-off styling                | Tailwind utilities |
| Sideways-scrolling page on a phone                  | Scroll the table inside its card; stack toolbars |
| `toLocaleDateString` / abbreviated month names      | Written or numeric date via the shared helper (§3.1) |

> [!CAUTION]
> **Every UI decision must be justifiable by a principle in §1.1.** If you can't name one, remove the element.

---

## 15. Taste Skills — Scope

Design taste skills (`design-taste-frontend`, `high-end-visual-design`, `gpt-taste`, `brandkit`,
`imagegen-frontend-web`) may be available in the agent environment. They target public marketing pages.

> [!CAUTION]
> 1. **Do not use them for authenticated screens** (`/dashboard`, `/supervisor`, `/beneficiary`) or the kiosk —
>    §1–14 apply there.
> 2. They may inform the public `AuthLayout` (login / signup) only.
> 3. **This document wins every conflict**: Lucide only, Roboto only, tokens only, no new animation libraries, no inline
>    styles, Vue 3 `<script setup>` (translate any React/JSX examples), both themes supported.
