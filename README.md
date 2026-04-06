# LS Opportunity Meeting Notes Approval

Standalone review/export repo for the LS Opportunity Meeting Notes Approval modern Acumatica extension.

This folder is intended for another developer to:

1. review the extension source
2. inspect the customization-project metadata
3. upload the packaged ZIP into Acumatica
4. review the mock n8n workflows and fixtures

## What is in this repo

### Extension source
- `App_RuntimeCode/LSOpportunityMeetingNotesApproval/`
  - backend DAC/graph/service code
- `FrontendSources/screen/src/development/screens/LS/`
  - modern UI screen source for:
    - `LS501000`
    - `LS501010`

### Customization project metadata
- `_project/`
  - `ProjectMetadata.xml`
  - `SiteMapNode_*.xml`
  - `ScreenWithRights_*.xml`
  - `Sql_LSOpportunityMeetingNotesApproval.xml`
  - `EntityEndpoint_LSOpportunityNotes_25_200_001.xml`

### Build/package artifacts
- `LSOpportunityMeetingNotesApproval.csproj`
- `Bin/`
- `obj/`
- `compile.rsp`
- `project.xml`
- `ls-opportunity-meeting-notes-approval.zip`

### Mock n8n assets
- `n8n/README.md`
- `n8n/*.mjs`
- `n8n/*.workflow.json`
- `n8n/*.json`
- `n8n/fixtures/`
- `n8n/acumatica-oauth.dev.md`

## Uploadable package

Use this file for manual Acumatica customization import/publish:

- `ls-opportunity-meeting-notes-approval.zip`

## What the package contains

The customization package includes:

- backend assembly: `LSOpportunityMeetingNotesApproval.dll`
- modern UI screen files for `LS501000` and `LS501010`
- packaged site map/workspace registration
- packaged screen rights
- packaged table schema
- packaged endpoint extension:
  - `LSOpportunityNotes/25.200.001`
  - top-level entity: `OpportunityNotesApproval`

## Intended review flow

### 1. Review extension code
- backend: `App_RuntimeCode/...`
- UI: `FrontendSources/...`
- customization metadata: `_project/...`

### 2. Review mock integration flow
- start with `n8n/README.md`
- inspect:
  - `n8n/build-fireflies-mock-workflow.mjs`
  - `n8n/fireflies-opportunity-meeting-notes-mock.workflow.json`
  - `n8n/build-fireflies-opportunity-workflow.mjs`

### 3. Upload the package
- import/publish `ls-opportunity-meeting-notes-approval.zip` in Acumatica

## Notes for another developer

- This is a **modern UI** extension; there is no ASPX page for these LS screens.
- `LS501000` is the queue/process screen.
- `LS501010` is the hidden entry/detail screen.
- The mock n8n flow is intended to create pending approval rows and provide transcript data for review/testing.
- OAuth details in `n8n/acumatica-oauth.dev.md` are included intentionally for this dev-only handoff.

## Quick file map

- package to upload: `./ls-opportunity-meeting-notes-approval.zip`
- backend source: `./App_RuntimeCode/LSOpportunityMeetingNotesApproval/`
- frontend source: `./FrontendSources/screen/src/development/screens/LS/`
- customization metadata: `./_project/`
- n8n assets: `./n8n/`

