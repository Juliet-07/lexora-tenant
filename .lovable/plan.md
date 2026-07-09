## Goal

Mirror the "My Team → Manage 90-day plan" experience for the two missing rungs of the hierarchy so probation feels identical at every level:

- **HOD → Managers on probation** — HOD runs the 90-day plan + monthly check-ins.
- **Tenant → HODs on probation** — Tenant runs the 90-day plan + monthly check-ins, then records the final decision.

The engine already exists (`ProbationRunnerPanel` in `ManagerProbationSheet.tsx` supports `mode: "manager" | "tenant"` and both sets of endpoints in `hr-probation-api.ts` are already wired). The gap is UX discoverability and one wiring bug — the tenant/HOD entry points don't look and behave like the manager's `MyTeam` cards.

## What's actually wrong today

1. `ManagerProbationSheet` renders `<ProbationRunnerPanel employee={employee} />` **without a `mode` prop**, even though `mode` is required. It happens to fall through as "manager" for both `MyTeam` (correct) and `MyDepartment` (HOD acting on a manager — also correct, same manager-side endpoints).
2. The tenant side has NO "cards with a Manage 90-day plan button" surface for HODs. The functionality is buried inside `HR → Probation` (click row → open sheet → Timeline tab). The user expects the same card + button pattern `MyTeam` uses.
3. `MyDepartment` already has the "Manage 90-day plan" button on probation managers — this rung works, we just formalise the `mode="manager"` wiring so it's explicit.

## Changes

### 1. `src/components/hr/ManagerProbationSheet.tsx`
- Add optional `mode?: "manager" | "tenant"` (default `"manager"`) to `ManagerProbationSheet`'s props and forward it to `ProbationRunnerPanel`. Keeps existing callers working; lets the tenant surface pass `mode="tenant"`.

### 2. `src/pages/hr/employee/MyDepartment.tsx`
- No behavioural change; pass `mode="manager"` explicitly to `ManagerProbationSheet` for clarity. HOD → Manager probation continues to hit the manager-side endpoints (backend authorises HOD via department scope).

### 3. `src/pages/hr/Probation.tsx` — add a "Heads of Department on probation" section
At the top of the tenant Probation page, above the existing "Active probations" table, add a dedicated cards grid that mirrors `MyTeam`:

- Filter `fetchAllProbationRecords()` results for employees whose `hierarchyRole === "head_of_department"`.
- Render each as a card (name, job title, probation end date, current stage badge) with a **"Manage 90-day plan"** button.
- Button opens `<ManagerProbationSheet employee={...} mode="tenant" onClose={...} />` — same sheet, same runner panel, same stages (Onboarding → M1 → M2 → M3), driven by the `*AsTenant` endpoints.
- Once Month 3 is complete, the runner panel's Final Decision card links into the existing decision flow (already in the sheet), so the tenant records confirm/extend/terminate from the same surface.
- The existing "Active probations" table stays as a full oversight list for everyone else (regular employees + managers on probation still run by their line manager/HOD respectively).

### 4. Verification
- Confirm `fetchAllProbationRecords` returns `hierarchyRole` on the employee shape; if not, extend the mapping in `hr-probation-api.ts` (`ProbationListEmployee`) to include it. If the endpoint doesn't expose it, fall back to cross-referencing with `fetchEmployeesByHierarchyRole("head_of_department")` from `hr-api.ts`.
- Run `tsgo` to make sure the new optional prop and the HOD filter compile.
- Manually walk the three rungs in the preview:
  - Manager → regular employee on probation (unchanged)
  - HOD → manager on probation (button on `MyDepartment`)
  - Tenant → HOD on probation (new cards on `HR → Probation`)

## Out of scope
- No backend changes — every endpoint required (`setProbationOnboardingAsTenant`, `completeProbationMonth1AsTenant`, etc.) already exists.
- No changes to how HODs are added on the Employees page — creating a HOD with `employmentStatus === "probation"` already produces a probation record server-side, same as any employee.
