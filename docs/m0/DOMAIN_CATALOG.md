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
| Subpoena approval | `app/routes/admin_routes.py:541-555`, prosecutor routes, and project-owner M4 decision | Only the assigned Prosecutor may transition a non-self-created subpoena from `Pending` to `Approved`; records immutable decision history | Confirmed |
| Subpoena denial | `app/routes/admin_routes.py:558-584`, prosecutor routes, and project-owner M4 decision | Only the assigned Prosecutor may transition a non-self-created subpoena from `Pending` to `Denied`; requires nonblank comment and records immutable denial/decision history | Confirmed |
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
| Administrator review authority | Project-owner M4 decision | Administrator has global visibility and administrative management authority but no subpoena approval or denial authority solely from the Administrator role | Approved |
| Assigned Prosecutor review authority | Project-owner M4 decision | Only the Prosecutor assigned to the case may approve or deny its subpoena | Approved |
| Creator self-review | Project-owner M4 decision | The subpoena creator may not approve or deny their own submission | Approved |
| Subpoena review transitions | Project-owner M4 decision | Review transitions are exactly `Pending` to `Approved` and `Pending` to `Denied`; no additional status is permitted | Approved |
| Resolution verdict terminology | Project-owner legacy-authority decision | Preserve exact legacy `Resolution.Verdict` values `For Filing`, `Dismissed`, and `Pending`; never rename or normalize `For Filing` to `Filing` | Approved |
| Resolution submission authority | Legacy `admin_routes.py:943-999`, `secret_routes.py:853-905`, and project-owner approved assignment scope | Administrator and scoped Secretary submit/revise; Prosecutor and Process Server cannot mutate Resolutions | Confirmed |
| Resolution review authority | Legacy `admin_routes.py:1002-1054`; no Prosecutor/Secretary review route | Only Administrator approves or denies a pending Resolution; legacy permits Administrator self-review | Confirmed |
| Resolution submission eligibility | Project-owner workflow clarification plus legacy Resolution linkage | Resolution submission requires an approved Subpoena; one current Resolution identity per case | Confirmed |
| Resolution validation and transitions | Legacy forms/templates and `admin_routes.py:943-1103`, `secret_routes.py:853-952` | `Pending` verdict cannot be submitted; `For Filing` requires Court; `Dismissed` clears Court; pending/denied revision returns status to `Pending`; review transitions are `Pending` to `Approved` or `Denied` | Confirmed |

## Blocked Clarifications

| Topic | Conflict or gap | Why blocked |
|---|---|---|
| Case versus Subpoena aggregate | Approved docs say target representation is blocked pending approval | M2 schema cannot decide whether `case` and `subpoena` are one operational record or distinct concepts |
| Process Server service scope | Approved docs say service-attempt recording is To confirm | Process Server mutation/service-result features cannot be implemented |
| Retention and purge policy | Listed unresolved in multiple docs | No purge/destructive data features can be implemented |
