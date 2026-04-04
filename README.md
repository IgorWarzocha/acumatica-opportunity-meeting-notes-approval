# Acumatica Opportunity Meeting Notes Approval

Acumatica extension assets for the Fireflies-to-Opportunity meeting notes approval flow.

## Repository Layout
- `backend/`
  - C# source for the LS approval DAC, graphs, and approval service
  - SDK-style build project used to produce `LSOpportunityMeetingNotesApproval.dll`
- `frontend/`
  - Modern UI source files for `LS501000` and `LS501010`
- `dist/`
  - installable customization ZIP export
- `docs/`
  - install notes for the Acumatica dev instance

## Install Artifact
- `dist/ls-opportunity-meeting-notes-approval-manual.zip`

## Main Screens
- `LS501000` `Opportunity Meeting Notes Approval`
- `LS501010` `Opportunity Meeting Notes Approval Entry`

## Notes
- This repo is an extension export, not a full Acumatica application checkout.
- The ZIP contains the current manual customization package artifact together with the modern UI source files used to build it.
