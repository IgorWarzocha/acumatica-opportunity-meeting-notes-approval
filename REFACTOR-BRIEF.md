# LS Opportunity Meeting Notes Approval Refactor Brief

This file records the agreed refactor direction before implementation.

## Goals

1. Redo the current detail screen as a **Form Details** layout mirroring the Cases screen.
2. Add a separate **processing screen** using `PXProcessing<T>`.
3. Move custom code into a more typical Acumatica custom-dev repo structure.
4. Make the repo look like a normal developer-facing extension repo instead of a runtime export bundle.
5. Keep the main extension repo free of environment-only `qp-calendar` workarounds.

## Confirmed decisions

### Namespace
Use the custom namespace:

- `LSOpportunityMeetingNotesApproval`

Do **not** use Acumatica base namespaces such as `PX.Objects.LS` for custom code.

### File organization
Organize source by type, without over-splitting:

- `DAC/`
- `Graph/`
- `Helper/`
- `sql/`

The intent is to avoid both extremes:
- not a flat runtime-export folder
- not too many tiny files

### SQL
Create separate SQL files in:

- `sql/`

### Screen split
- one screen should be a proper **processing screen** using `PXProcessing<T>`
- one screen should be a **Form Details** screen

### Action pattern
Rewrite actions to the standard pattern Aleks requested:
- `PXAction<T>` field
- `[PXButton]`
- `[PXUIField]`
- collect records from `PXAdapter`
- start `PXLongOperation`
- call static processing methods such as `ApproveMethod(List<T> list, bool massProcess)`

### Processing method pattern
Static processing methods should:
- iterate typed records
- create graph instances inside the long operation
- use `PXTransactionScope`
- use `PXProcessing<T>.SetError(ex)` in mass processing mode
- throw normally outside mass processing mode

### Graph usage
Do not use:
- `graph.View.Cache.CreateInstance()`

Prefer:
- `graph.View.Insert()`

### Style preferences
- wrap sections in `#region`
- shorten names to more typical Acumatica style where applicable, e.g. `BAccountID`
- use strong types directly instead of vague `row` naming where practical
- keep as much as possible in a small number of sensible files

## Implementation order

1. Repo structure and namespace cleanup
2. SQL extraction into `/sql`
3. Graph/action rewrite
4. Processing-screen rewrite with `PXProcessing<T>`
5. Form Details screen rewrite
6. rebuild, Acuminator, package refresh
