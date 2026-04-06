# LS Opportunity Meeting Notes Approval Install

This is the clean-instance install path that was verified on the Acumatica 25.201 dev environment backed by the seeded demo database.

## Package Inputs
- Backend DLL: `development/package/ls-opportunity-meeting-notes-approval/Bin/LSOpportunityMeetingNotesApproval.dll`
- Generated customization package ZIP: `development/package/ls-opportunity-meeting-notes-approval.zip`

Generate the ZIP with:

- `Automation/Setup/build-ls-modern-package.ps1`

## Verified Install Flow
1. Open `http://127.0.0.1:38121/AcumaticaERP`.
2. Log in as `admin` / `admin1!`.
3. Open `SM204505` (`Customization Projects`).
4. Click `Import`.
5. Upload `development/package/ls-opportunity-meeting-notes-approval.zip`.
6. Wait for the new project row to appear.
   The imported project name should appear as `lsopportunitymeetingnotesapproval` or a similar normalized variant based on the package metadata.
7. In the project grid, check the first editable checkbox column (`IsWorking`) for that row.
   Do not click the row-selector, `Files`, or `Notes` cells; the publish action only enables when `IsWorking` is checked.
8. Click `Publish` in the toolbar.
9. In the `Customization Publishing` pane, wait for validation to complete.
10. Click the inner `Publish` button in the compiler frame when Acumatica shows:
    `Warning. Active website users will be logged out.`
11. Wait for the compiler frame to report:
    `Customization project published successfully. You can close the Compilation pane.`

## Verified Publish Output
The publish frame reported these steps successfully:
- `Compiled projects: lsopportunitymeetingnotesapprovalmanual`
- `Validation finished successfully.`
- `Cleaning up the database`
- `Removing previous Modern UI files`
- `Updating website files`
- `Starting the website`
- `Website updated.`
- `Customization project published successfully.`

## Current Package Shape
- The package is now built through `PX.CommandLine.exe /method buildproject`.
- That produces `project.xml` entries for:
  - `Bin\LSOpportunityMeetingNotesApproval.dll`
  - `screens\LS\LS501000\*` and `screens\LS\LS501010\*` as `PerTenantFile` items
- The package also injects an inline `Sql` item that:
  - creates or updates `SiteMap` rows for `LS501000` and `LS501010`
  - places `LS501000` in the existing `Opportunities` workspace
  - keeps `LS501010` hidden from normal navigation
- The package now also includes official `ScreenWithRights` customization items for:
  - `LS501000`
  - `LS501010`
  seeded with the same baseline Acumatica uses for new forms in customization: `Customizer` with access level `4`.
- After publish, use `SM201020` (`Access Rights by Screen`) to grant additional roles as needed.
- This is the prod-like publish shape for the current LS modern screens because Acumatica can compile and deploy the tenant screen files during publish and register navigation during the same publish.

## What Was Not Reliable
- Direct PowerShell calls into low-level `PX.Web.Customization` document APIs from outside the app context were brittle in this environment.
- The supported path that worked was building the package through `PX.CommandLine.exe` and importing it through `SM204505`.

## Post-publish verification
After publish, verify directly:
- global search finds `LS501000`
- `http://127.0.0.1:38121/AcumaticaERP/Main?ScreenId=LS501000`
- `http://127.0.0.1:38121/AcumaticaERP/Main?ScreenId=LS501010`
- the `Opportunities` workspace shows `Opportunity Meeting Notes Approval`

Fallback runtime sync scripts are now legacy troubleshooting helpers only and should not be part of the normal production-style install path.
