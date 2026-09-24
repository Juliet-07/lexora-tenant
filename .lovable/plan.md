# Policy & Procedure Management — Detailed Workflow

## Goal

Rebuild the tenant Policy & Procedure page to match the uploaded reference while preserving the working API flows for policy upload, download, deletion, employee acknowledgement, and external acknowledgement. Everything the API does not currently store will behave as persistent demo data in the browser.

## What will change

### 1. Policy register and oversight
- Add summary figures for total policies, published/draft/review counts, overdue reviews, average acknowledgement, and staff with gaps.
- Add search and status filters for All, Published, Draft, Under review, Overdue, Superseded, and Archived.
- Group the register into collapsible subject areas: Legal & Compliance, IT/Data/Cyber, Website & Client-facing, HR & People, Operations & Finance, and Governance.
- Show owner, version, lifecycle status, next review date, acknowledgement rate, document, and an explicit Open action.
- Add working “send reminders” feedback and CSV acknowledgement export.

### 2. New policy flow
- Expand “Upload policy” into the reference’s structured policy setup flow.
- Keep the real API upload fields and file submission: title, category, organisation/board type, and document.
- Add template selection, owner, approval authority, review frequency, acknowledgement requirement, description/scope, and linked regulations as persistent demo metadata.
- Provide the full template catalogue from the reference and prefill sensible titles/categories while still supporting a blank custom policy.

### 3. Full policy workspace
Opening a policy will replace the small side panel with a full workspace containing:
- A clear header with category, lifecycle status, owner, version, review information, document download, review action, edit/save controls, and deletion.
- **Editor:** section navigation, rich-text content editing, adding/removing sections, document properties, and saved-state feedback.
- **Properties:** policy reference, effective date, superseded document, related policies, owner, approval authority, review frequency, linked regulations, acknowledgement audience, and re-acknowledgement rules.
- **Acknowledgements:** completion rate, current-version staff status, real acknowledgement records merged with realistic demo assignees, reminder action, CSV export, and all-version history.
- **Version history:** current and previous versions, authors, change summaries, approval details, version viewing/comparison, and archive export feedback.
- **Comments:** review discussion with replies and a working add-comment flow.

### 4. Lifecycle and review workflow
- Support Draft → Under review → Approved/Published → Superseded/Archived states in the demo layer.
- “Send for review” will create a review event/comment and move the policy to Under review.
- Publishing/version updates will record a new version-history entry and reset demo acknowledgement tracking where re-acknowledgement is mandatory.
- Review due dates and overdue indicators will update from the configured review frequency.

### 5. Data boundaries
- The existing API remains authoritative for uploaded policy files, policy records, deletion, and acknowledgement submissions.
- Additional workflow data is keyed to each API policy and persisted locally so the prototype remains interactive between refreshes.
- Employee “My Policies” and the public acknowledgement page remain connected to the existing API and are not replaced with mock-only flows.

## Technical details

- Add a focused policy-workflow store for metadata, sections, comments, versions, assignees, and lifecycle transitions.
- Split the large tenant screen into focused register, setup dialog, and workspace components.
- Reuse the existing rich-text editor and semantic design components/tokens.
- Remove unsafe non-null assertions in any policy files touched during the rebuild.

## Verification

- Run the project’s TypeScript check.
- Test the tenant flow in the preview: filter/search, create/upload, open workspace, edit content/properties, send for review, update status, add comments, send reminders, export acknowledgement data, download the uploaded file, and delete.
- Confirm the employee and external acknowledgement pages still load and retain their existing API behavior.
- Check the policy register and workspace at desktop and mobile widths for overflow and readable controls.

## Out of scope

- No backend or endpoint changes.
- Demo-only metadata will not sync between devices or users until matching endpoints exist.
