# M0 Domain Catalog

This catalog is a source-referenced baseline for LexVerdict. It does not authorize feature implementation by itself. Any row marked `Blocked` must be clarified by the project owner before the affected feature is implemented.

## Authoritative Sources

| Source | Path |
|---|---|
| Approved project documentation | `C:\Obsidian\Nicolas Second Brain\Projects\Active\LexVerdict` |
| Read-only legacy reference | `C:\Projects\LexVerdict` |

## Confirmed Exact Values

| Domain area | Field | Exact values | Evidence | Target representation | Status |
|---|---|---|---|---|---|
| Staff identity | `User.Role` | `PS`, `Prosecutor`, `Secretary`, `superuser` | `app/models.py:71`, `app/forms.py:74-79` | Controlled role values; labels may explain `PS` as Process Server without changing stored value | Confirmed |
| Subpoena workflow | `Subpoena.Status` | `Pending`, `Approved`, `Denied` | `app/models.py:131` | Separate subpoena status enum/check constraint | Confirmed |
| Resolution workflow | `Resolution.Verdict` | `For Filing`, `Dismissed`, `Pending` | `app/models.py:192-193`, `app/forms.py:52-53` | Separate resolution verdict enum/check constraint | Confirmed from legacy |
| Resolution workflow | `Resolution.Status` | `Pending`, `Approved`, `Denied` | `app/models.py:198-200` | Separate resolution status enum/check constraint | Confirmed |
| Involved parties | `InvolvedParty.Role` | `Complainant`, `Respondent` | `app/models.py:164`, `app/routes/admin_routes.py:318-319` | Controlled party role values | Confirmed |
| Denial comments | `DenialComment.Type` | `Subpoena`, `Resolution` | `app/models.py:227`, `app/routes/admin_routes.py:566-574`, `app/routes/admin_routes.py:1031-1042` | Separate denial-comment type enum/check constraint | Confirmed |
| Person suffix | `Person.Suffix` | `Jr.`, `Sr.`, `II`, `III`, `IV` | `app/models.py:17`, `app/forms.py:25` | Controlled suffix values | Confirmed |

## Confirmed Workflow Evidence

| Workflow | Legacy evidence | Preserved behavior | Status |
|---|---|---|---|
| Subpoena approval | `app/routes/admin_routes.py:541-555` and prosecutor routes | Sets subpoena `Status` to `Approved` and logs action | Confirmed |
| Subpoena denial | `app/routes/admin_routes.py:558-584` | Requires nonblank comment, sets `Status` to `Denied`, records `DenialComment` with `Type = Subpoena`, logs action | Confirmed |
| Subpoena edit/resubmit | `app/routes/admin_routes.py:672`, `app/routes/secret_routes.py:636-641` | Editing sets subpoena `Status` back to `Pending` and preserves denial feedback visibility | Confirmed |
| Resolution submit | `app/routes/admin_routes.py:949-995`, `app/routes/secret_routes.py:859-899` | Rejects `Pending` verdict for submission, stores verdict/date/court, sets resolution `Status` to `Pending` | Confirmed |
| Resolution approval | `app/routes/admin_routes.py:1005-1016` | Sets resolution `Status` to `Approved` and logs action | Confirmed |
| Resolution denial | `app/routes/admin_routes.py:1020-1049` | Requires nonblank comment, sets `Status` to `Denied`, records `DenialComment` with `Type = Resolution`, logs action | Confirmed |
| Resolution edit/resubmit | `app/routes/admin_routes.py:1059-1102` | Only `For Filing` and `Dismissed` are accepted for edit/resubmit; status returns to `Pending` | Confirmed |
| Public lookup | `app/routes/auth_routes.py:57-78`, `templates/case_lookup.html:150-169` | Requires exact docket number plus PIN; approved `For Filing` and approved `Dismissed` display final outcome, otherwise pending-like display | Confirmed |
| Reports | `app/routes/admin_routes.py:1245-1246`, `app/routes/admin_routes.py:1503-1504` | Include only `Verdict IN ('For Filing', 'Dismissed')` and `Resolution_Status = 'Approved'` | Confirmed |
| Docket allocation | `app/routes/admin_routes.py:155-196`, `app/routes/admin_routes.py:359-402` | `III-09-INV-{YY}{A-L}-{NNNN}`; multi-offense reserves first and last serial in displayed docket | Confirmed |

## Explicit Project-Owner Decisions

| Decision | Source | Target impact | Status |
|---|---|---|---|
| Modern stack is Laravel, React, Inertia, TypeScript, PostgreSQL/Supabase | Approved planning package and `Overview.md` | Technical architecture only; no domain rename | Approved |
| One Prosecutor has exactly one Secretary and one Secretary has exactly one Prosecutor | `Overview.md` and project-owner confirmation | Mandatory one-to-one assignment invariant in M1 | Approved |
| Do not migrate old mock transactional rows; create new mock data after workflows are complete | Project-owner decision before M0 | Migration plan excludes legacy mock subpoenas/resolutions/denial comments/audit rows | Approved |
| Do not add `Awaiting Filing`, `Filed`, or other new filing statuses | Project-owner decision before M0 | Process Server visibility must derive from existing resolution `Verdict` and `Status` fields only | Approved |

## Blocked Clarifications

| Topic | Conflict or gap | Why blocked |
|---|---|---|
| Exact verdict wording | Approved docs still list a conflict between project-owner wording `Filing` and legacy value `For Filing` | M5 resolution implementation must not choose or normalize until the project owner confirms the exact stored/UI value |
| Case versus Subpoena aggregate | Approved docs say target representation is blocked pending approval | M2 schema cannot decide whether `case` and `subpoena` are one operational record or distinct concepts |
| Process Server service scope | Approved docs say service-attempt recording is To confirm | Process Server mutation/service-result features cannot be implemented |
| Admin versus prosecutor review hierarchy | Listed unresolved in `Business Rules.md` | M4 review policies require clarification |
| Creator self-review | Listed unresolved in `Business Rules.md` | M4 review actions require clarification |
| Retention and purge policy | Listed unresolved in multiple docs | No purge/destructive data features can be implemented |
