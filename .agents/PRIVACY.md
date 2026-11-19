# PPESO CLIENT ATTENDANCE — Privacy Agent (Data Privacy Act of 2012)

> **Purpose**: This system processes personal information of PESO personnel, program beneficiaries (GIP, TUPAD) and
> walk-in clients of the Provincial PESO of Agusan del Sur. The **Data Privacy Act of 2012 (Republic Act No. 10173)**,
> its Implementing Rules and Regulations (IRR), and the circulars of the **National Privacy Commission (NPC)** apply to
> every line of code that touches that data. This document turns those obligations into rules an AI agent must follow.
> Read it for **any** task that collects, shows, stores, shares, exports, logs or deletes personal data — together with
> [`SECURITY.md`](SECURITY.md).
>
> This is an engineering rulebook, not legal advice. When a rule here and the law disagree, the law wins: stop and ask
> the user to check with the Data Protection Officer (DPO).

---

## 0. The Hard Rules

> [!CAUTION]
> Violating any of these is a release blocker.
>
> 1. **No new personal data field without a purpose.** Every column or form field that holds personal data must serve
>    attendance keeping, client logging, or office administration. Collecting something new for a new purpose needs the
>    user's (PIC's) decision and a privacy notice update (§3). *(Sec. 11(a)–(c), proportionality)*
> 2. **Sensitive personal information needs a lawful basis.** Age / birth date, civil status, religion, health or
>    disability, education, government ID numbers (TIN, SSS, PhilHealth, GSIS) and similar are sensitive (Sec. 3(l)).
>    The system collects none of them today — **don't add them** without a law or consent that requires them (Sec. 13).
> 3. **Least access.** RLS gives each role only what its work needs (SECURITY.md §4). Never widen a policy, add a
>    `select('*')` on other people's records to a list, or expose a column to a role "for convenience".
> 4. **Passcodes are credentials, not data to display.** They appear only in User Management for admins and are never
>    exported, logged, cached or sent anywhere. *(Sec. 20)*
> 5. **No personal data in logs, URLs, analytics or third-party calls.** No names, emails, contact numbers, addresses or
>    passcodes in `console.*`, query strings, route params (beyond opaque UUIDs), error messages, or external APIs. The
>    PSGC API receives location codes only.
> 6. **No personal data in browser storage.** `localStorage` holds the session, theme and PSGC reference data only
>    (BACKEND.md §10). Records stay in memory.
> 7. **Exports are deliberate.** CSV exports (attendance, client records, offices, users) are admin-only screens, export
>    only the filtered rows the admin chose, and never include passcodes. A new export follows the same rules.
>    **Known violation:** `exportProfilesToCsv` (`src/helpers/peso/userManagementHelper.ts`) still writes a `Passcode`
>    column — remove it when touching User Management.
> 8. **Nothing personal leaves the system unannounced.** Sending personal data to a new third party (API, AI model,
>    analytics, SMS/email provider, another agency) requires a data sharing / processing agreement and a privacy notice
>    update. *(Sec. 14, 21; IRR Sec. 43–45)*
> 9. **Deletion is real.** Deleting a record removes it from the database; don't build "soft delete" that keeps personal
>    data visible or recoverable by others without a retention reason (§5).
> 10. **Report possible breaches immediately** (§7). Don't quietly fix an exposure and move on.

---

## 1. Roles and Responsibilities

| Role (law)                            | In this system |
| ------------------------------------- | -------------- |
| Personal Information Controller (PIC) | Provincial Government of Agusan del Sur, through the Provincial PESO |
| Data Protection Officer (DPO)         | Designated by the PIC — ask the user who it is when a decision is needed |
| Personal Information Processors (PIP) | Supabase (database, auth, hosting in ap-southeast-1 / Singapore — a cross-border transfer); psgc.cloud receives no personal data |
| Data subjects                         | PESO personnel, GIP / TUPAD beneficiaries, walk-in clients |

Organizational duties outside the code (remind the user; don't invent the documents):

- DPO designation and NPC registration of the data processing system, if required (NPC Circular 2022-04).
- A Privacy Impact Assessment for the system, repeated when a new purpose or processor is added.
- A processing agreement with Supabase covering cross-border storage.
- Staff confidentiality undertakings and privacy training for kiosk / client-logging staff.

---

## 2. Data Inventory

| Category | Where | Sensitive? |
| -------- | ----- | ---------- |
| Account: email, password hash | `auth.users` (Supabase Auth) | No |
| Profile: full name, position, role, status, office | `public.profiles` | No |
| Kiosk passcode | `public.profiles.passcode` | **Credential** — treat as secret |
| Daily time records: check-in/out times and statuses | `core.attendances` | No, but confidential employment data (used for payroll and performance) |
| Walk-in client: full name, gender, contact number, province / municipality / barangay / purok, purpose of visit, visit times | `core.walkin_attendances` | Not sensitive under Sec. 3(l), but the **purpose** can reveal program participation (e.g. OFW, GIP, SPES) — confidential |
| Accomplishment reports: daily work entries, activities, pay for the period (PGAS), signatory names, review remarks | `core.accomplishment_reports` | No, but confidential employment and pay data; visible to the writer, admins and their office supervisor |
| GIP / TUPAD funding (DOLE / PGAS) | `public.profiles.funding` | No |
| GIP evaluations: monthly 1–5 ratings of performance and attitude, average scores, supervisor remarks, evaluator | `core.gip_evaluations` | No, but confidential performance data; visible to the writing office's supervisor and admins only — **not** to the GIP |
| Profile picture (face photo) | Storage bucket `avatars` (private), path in `public.profiles.avatar_path` | No, but identifies the person; visible to them and admins only; printed on the GIP ID; deleted with the account |
| Offices | `public.offices` | No personal data |
| Office directory: office name, code, **office head's name**, status | `public.directories` | No — but the head's name is personal data; readable by every signed-in user |

When you add a table or column that holds personal data, add it here.

---

## 3. Transparency (Sec. 16(a), 18)

> [!WARNING]
> **Gap:** the system has no Privacy Notice page and records no acknowledgement. Walk-in clients are logged by staff, so
> the office must inform them at the point of collection (a posted notice or a line on the visitor log) of: who
> collects the data, why, how long it's kept, who it's shared with, and how to exercise their rights.

When asked to add one:

1. Add a public route `/privacy` (under `AuthLayout`) with the notice content in a composable, linked from Login,
   Signup and the sidebar footer.
2. State: PIC and DPO contact, data collected (§2), purposes, legal basis (public function / performance of a contract
   for staff; consent or public function for walk-ins), Supabase as processor with storage outside the Philippines,
   retention (§5), security measures, data subject rights, and the right to complain to the NPC.
3. Version the notice; changing what it says about data, purposes, recipients or retention bumps the version.

---

## 4. Storage and Access (Sec. 20)

1. **RLS is the access control** (SECURITY.md §4). Supervisors see their own office only; beneficiaries see only their
   own records; walk-in records are visible to admins and supervisors only.
2. **Select only the columns a screen shows** when reading other people's records — every selected column is visible in
   DevTools' Network tab.
3. **Files go in private buckets.** The buckets are `avatars` (profile pictures, migration
   `20261118000200_profile_photos.sql`): private, opened by 1-hour signed URLs, the path (never a URL) stored on the
   profile, each user limited to their own folder, admins read / delete. New uploads follow the same pattern. A photo
   picked only for a GIP ID stays in the browser and is never uploaded. `pacd-files` (the admin Files page: office forms,
   not personal data) is admin-only and opened by 10-minute signed URLs.
4. **The kiosk device** runs an admin session; the office must keep it physically supervised (SECURITY.md §5).

---

## 5. Retention (Sec. 11(e))

> [!WARNING]
> **Gap:** nothing is purged automatically. Attendance and walk-in records grow forever.

- Daily time records are government records: they follow the National Archives of the Philippines records disposition
  schedule (RA 9470) and must **not** be auto-deleted from client code.
- Walk-in client logs should get a retention period set by the PIC/DPO. When one is decided, implement it as a
  database function scheduled with pg_cron (like `core.flag_daily_absences`), never from the browser, and record the
  period here.
- Deleting a user in User Management (`admin_delete_user`) removes the login, the profile and their attendance rows.
  Daily time records are government records (above): export them first if the records schedule requires keeping them.

---

## 6. Data Subject Rights (Sec. 16–18)

| Right                 | How it's honoured today |
| --------------------- | ----------------------- |
| Be informed           | Office notice at collection (§3 gap) |
| Access / portability  | Beneficiaries see their own DTR in the app; admins can export a person's records on request (CSV) |
| Rectification         | Users edit their own name; admins correct everything else |
| Erasure or blocking   | Admin deletes the record (walk-in) or the account (User Management → login, profile, attendance), unless a records schedule requires keeping it |
| Object / complaint    | Handled by the DPO outside the app |

> [!IMPORTANT]
> Never remove a user's ability to see their own records or an admin's ability to correct and delete them.

### Checklist for Every Change That Touches Personal Data

- [ ] Purpose fits attendance, client logging or office administration; anything new → user/DPO decision + notice update
- [ ] No sensitive personal information added without a cited law or consent
- [ ] New table: RLS + narrow policies + listed in §2
- [ ] Lists select only the columns shown; no `select('*')` on other people's records
- [ ] Passcodes never displayed outside User Management, never exported, logged or cached
- [ ] No personal data in console, URLs, error messages, `localStorage` or third-party calls
- [ ] Exports are admin-only, use the filtered rows, and exclude passcodes
- [ ] Retention considered (§5)
- [ ] New third party → agreement + notice update (Rule 8)

---

## 7. Personal Data Breaches (Sec. 20(f), 30; NPC Circular 16-03)

If an agent finds evidence of a breach — an RLS hole exposing other people's rows, exposed passcodes, a leaked key,
personal data in logs or browser storage, a public export — **stop, tell the user immediately, and say it may be
notifiable.** The PIC must notify the NPC and affected data subjects **within 72 hours** of knowledge when the breach
involves sensitive or identity-fraud-enabling data and there's a real risk of serious harm.

> [!WARNING]
> Before migration `20261113000100_rls_policies.sql` (applied 11/13/2026), the live database let anyone with the public
> anon key read every profile including **passcodes**, write or delete attendance and walk-in records, and let any
> signed-in user make themselves admin. The user was told; whether this needs NPC notification is a DPO decision.
