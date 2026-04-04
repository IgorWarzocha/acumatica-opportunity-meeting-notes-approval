# LS Opportunity Meeting Notes Approval Install

This is the clean-instance install path that was verified on the Acumatica 25.201 dev environment backed by the seeded demo database.

## Package Inputs
- Backend DLL: `development/package/ls-opportunity-meeting-notes-approval/Bin/LSOpportunityMeetingNotesApproval.dll`
- Manual customization package ZIP: `development/package/ls-opportunity-meeting-notes-approval-manual.zip`

## Verified Install Flow
1. Open `http://127.0.0.1:38121/AcumaticaERP`.
2. Log in as `admin` / `admin1!`.
3. Open `SM204505` (`Customization Projects`).
4. Click `Import`.
5. Upload `development/package/ls-opportunity-meeting-notes-approval-manual.zip`.
6. Wait for the new project row to appear.
   The imported project name currently appears as `lsopportunitymeetingnotesapprovalmanual`.
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

## Important Limits
- The ZIP currently contains the DLL and Modern UI source files only.
- It does not yet contain full custom form/site-map packaging metadata.
- Because of that, publish success does not automatically prove final menu/search surfacing.
- The reliable post-publish check is still direct screen routing first: `LS501000` and `LS501010`.

## What Was Not Reliable
- Direct PowerShell calls into `PX.Web.Customization` from outside the app context were not reliable in this environment.
- The `SM204510` project editor kept falling back to stale demo-project state, so `SM204505` import/publish was the dependable path.


## Demo Runtime Sync
After package publish on this dev instance, run `./Automation/Setup/install-ls-demo-extension.sh`.

This copies the LS backend DLL, generated `LS501000` / `LS501010` bundles, matching shared `app.*` bundle, and `App_Data/TSScreenInfo` metadata into the live site root at `C:\AcumaticaLocal\AcumaticaERP`, then recycles `AcumaticaERPAppPool`.

Use this on the clean seeded instance when the customization project publishes successfully but the live site still does not have the LS runtime assets.

After that, verify:
- `http://127.0.0.1:38121/AcumaticaERP/Scripts/Screens/LS501000.html`
- `http://127.0.0.1:38121/AcumaticaERP/Main?ScreenId=LS501000`
