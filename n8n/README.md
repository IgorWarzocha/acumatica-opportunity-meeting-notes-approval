# n8n Workflow Notes

## Artifacts

- `build-fireflies-opportunity-workflow.mjs`
  - Generates the workflow JSON artifact.
  - The live workflow fetches raw Fireflies GraphQL and immediately canonicalizes it into the client payload shape before any matching or Acumatica calls.
- `fireflies-opportunity-meeting-notes-approval.workflow.json`
  - Importable workflow export for the Fireflies -> Acumatica pending approval flow.
- `build-fireflies-mock-workflow.mjs`
  - Generates the manual mock workflow JSON artifact.
- `fireflies-opportunity-meeting-notes-mock.workflow.json`
  - Importable mock workflow export that produces best-guess Fireflies and Acumatica payloads without calling Fireflies, and can post the approval row plus transcript attachment into Acumatica once an OAuth2 credential is attached.
- `build-opportunity-summary-sync-workflow.mjs`
  - Legacy builder for the earlier post-approval summary-sync concept.
- `opportunity-summary-sync.workflow.json`
  - Legacy workflow export retained for reference only; current direction is to keep approval-side business logic in Acumatica.
- `fireflies-webhook.best-guess.json`
  - Best-guess minimal Fireflies webhook event payload.
- `fireflies-transcript.best-guess.json`
  - Current client-side canonical Fireflies meeting payload used by the mock flow and simulator.
- `simulate-fireflies-flow.mjs`
  - One-shot local simulator for the Fireflies -> Acumatica mapping logic using the checked-in best-guess fixtures.
- `fireflies-mock-preview.best-guess.json`
  - Generated preview output from `simulate-fireflies-flow.mjs`.
- `fireflies-acumatica.env.example`
  - Example runtime configuration for n8n/deployment only, not for Acumatica package compile-time settings.

## Local Dev Instance

The current local dev instance is:

- container: `n8n`
- image: `docker.n8n.io/n8nio/n8n:2.13.4`
- URL: `http://172.17.0.1:5678`
- project ID: `DNPLHdu0cQi68Md0`

The workflow has been imported into that local instance.

Workflow details:

- workflow ID: `5c7c4f1e-8f3d-4ec7-8fd8-72ec145f0c33`
- workflow name: `Fireflies Opportunity Meeting Notes Approval`
- mock workflow ID: `c7d3a9e3-3d37-4dc5-bb52-f4c390c409ea`
- mock workflow name: `Fireflies Opportunity Meeting Notes Mock`
- summary sync workflow ID: `f251dd7b-9f0d-4cb1-bd6e-2d8a68c00d46`
- summary sync workflow name: `Opportunity Summary Sync` (legacy / not current target)

## Current Source of Truth

Use the March 27, 2026 client conversation as the authoritative contract when older repo notes disagree.

- Fireflies goes through `n8n` only.
- `n8n` creates the pending `OpportunityNotesApproval` row and uploads the generated HTML transcript.
- Acumatica `Approve` creates the official `CRActivity` on the confirmed opportunity.
- After approval, the transcript should live on the created `CRActivity`, not remain on the approval row.
- Matching scope for opportunities is `Status ne 'Lost' and Status ne 'Won'`.
- If multiple candidates are plausible, `SuggestedOpportunityID` may be populated but `ConfirmedOpportunityID` must remain blank for Stephen.
- The client answer `Approve button + manual editing is fine.` confirms the approve flow is sufficient, but it does not explicitly ban a reject action.
- The current packaged API contract is `LSOpportunityNotes/25.200.001/OpportunityNotesApproval`.
- On this instance, the observed `Default` entity object names are singular (`Contact`, `Opportunity`), so the live workflow uses those runtime paths.

## Webhook Path

The workflow listens on:

- `POST /webhook/fireflies/opportunity-meeting-notes-approval`

Depending on how the n8n instance is being used, the exact runtime URL may differ between test and production webhook URLs in the UI.

## Required Environment Variables

These are runtime/deployment values for n8n and external connectivity. They are not intended to become Acumatica package compile-time defaults.

### Fireflies

- `FIREFLIES_API_KEY`
  - Required bearer token for Fireflies GraphQL.
- `FIREFLIES_GRAPHQL_URL`
  - Optional.
  - Defaults to `https://api.fireflies.ai/graphql`.

### Acumatica

- `ACU_BASE_URL`
  - Base URL without trailing slash.
  - Example dev value: `https://localhost:443`
- `ACU_INSTANCE_NAME`
  - Acumatica instance name.
- `ACU_APPROVAL_ENDPOINT_NAME`
  - Optional.
  - Defaults to `LSOpportunityNotes`.
- `ACU_APPROVAL_ENDPOINT_VERSION`
  - Optional.
  - Defaults to `25.200.001`.
- `ACU_APPROVAL_FILE_URL_TEMPLATE`
  - Optional override for the approval-record attachment upload route.
  - Supported placeholders:
    - `{baseUrl}`
    - `{instance}`
    - `{id}`
    - `{fileName}`

Example:

```text
{baseUrl}/{instance}/entity/LSOpportunityNotes/25.200.001/OpportunityNotesApproval/{id}/files/{fileName}
```

## Acumatica Auth

Use OAuth on the Acumatica HTTP Request nodes.

The Acumatica nodes in the generated workflows are now set to:

- `Authentication`: `Generic Credential Type`
- `Generic Auth Type`: `OAuth2 API`

In the n8n UI, attach the shared credential shown in your screenshot, for example:

- `Acumatica OAuth`

This does not reduce the number of business HTTP calls. It stops the workflow from creating a fresh Acumatica login session pattern for those calls, which is what was running into the API login limit.

## Best-Guess Built-In Acumatica OAuth Setup

For Acumatica's built-in OAuth and n8n's generic OAuth2 credential, the best-guess interoperable setup is:

- Acumatica Connected Application flow: `Authorization Code`
- n8n credential type: `OAuth2 API`
- authorization URL:
  - `{ACU_BASE_URL}/{ACU_INSTANCE_NAME}/identity/connect/authorize`
- access token URL:
  - `{ACU_BASE_URL}/{ACU_INSTANCE_NAME}/identity/connect/token`
- scope:
  - `api offline_access`

The mock workflow JSON cannot embed the credential itself; attach your n8n Acumatica OAuth credential to these nodes after import:

- `Create Approval Record`
- `Upload Transcript Attachment`

If you use self-signed HTTPS in dev, keep `allowUnauthorizedCerts = true` on the HTTP Request nodes.

## Current Matching Behavior

The workflow currently uses deterministic matching inside a `Code` node:

- validates that the incoming Fireflies webhook contains `meetingId`
- filters out `@bpw.com` attendees
- queries contacts by attendee email
- queries open opportunities using `Status ne 'Lost' and Status ne 'Won'`
- scores opportunities by:
  - business account alignment
  - keyword overlap between Fireflies title/summary and opportunity subject
- always leaves `ConfirmedOpportunityID` blank so Acumatica can remain the human confirmation boundary
- only sends numeric `BusinessAccountID` and `ContactID` values into Acumatica fields

This is a practical dev-safe placeholder. It is not the final LLM-assisted ranking step described in the PRD.

## Current Approval Contract

The target contract is the custom `LSOpportunityNotes` endpoint:

- read contacts:
  - `GET /entity/Default/25.200.001/Contact`
- read opportunities:
  - `GET /entity/Default/25.200.001/Opportunity`
- create approval row:
  - `PUT /entity/LSOpportunityNotes/25.200.001/OpportunityNotesApproval`
- upload transcript attachment:
  - `PUT /entity/LSOpportunityNotes/25.200.001/OpportunityNotesApproval/{approvalId}/files/{fileName}`

The workflow now prefers the create response file-upload link in `_links` and falls back to the configured template only if that link is absent.

The payload includes:

- `ExternalMeetingID`
- `ExternalClientReferenceID`
- `MeetingDate`
- `MeetingTitle`
- `MeetingSummary`
- `TranscriptHtml`
- `TranscriptUrl`
- `OrganizerEmail`
- `ParticipantEmails`
- `BusinessAccountID`
- `ContactID`
- `SuggestedOpportunityID`
- `ConfirmedOpportunityID`
- `MatchDiagnostics`
- `Subject`

`ConfirmedOpportunityID` is intentionally sent blank. n8n only proposes `SuggestedOpportunityID`; Stephen confirms or corrects the real opportunity inside Acumatica before approval.

## Dev Execution Notes For This Workspace

These are specific to the current local n8n container and are now part of the documented workflow because we hit them multiple times.

- The checked-in workflow JSON may use `$env...` expressions for endpoint selection, but this local n8n instance blocks env access inside workflow expressions (`N8N_BLOCK_ENV_ACCESS_IN_NODE`).
- For the current local runtime, the imported workflow should use the concrete Acumatica URL:
  - `http://172.17.0.3/AcumaticaERP/entity/LSOpportunityNotes/25.200.001/OpportunityNotesApproval`
- One-shot CLI execution from a separate temporary n8n container can fail if the workflow relies on stored OAuth credentials, because that execution path may not initialize the same license/provider state used by the long-running container.
- The reliable local dev path was:
  1. export/import the workflow through the running `n8n` container
  2. use the existing `Acumatica OAuth` credential for the imported workflow in the running container
  3. for forced CLI one-shot execution, temporarily replace the HTTP node auth with a direct `Authorization: Bearer ...` header using a freshly refreshed token from the documented dev OAuth app

## Latest Verified Local Mock Run

After the package publish that added:

- `LS501000`
- `LS501010`
- `LSOpportunityMeetingNotesApproval`
- `LSOpportunityNotes/25.200.001/OpportunityNotesApproval`

the mock workflow was executed successfully against the local instance and created:

- `ApprovalID = 1`
- `ExternalMeetingID = 01KEG1NZ6RHJ7S3V71D4T70ZBJ`
- `Status = Pending`
- `NoteID = DC827F75-AB31-F111-B9AE-E014DE1E9F70`

The created approval row also has a linked file note entry in `NoteDoc`, confirming transcript attachment creation on the pending approval record before approval.

## Legacy Post-Approval Sync Workflow

The second workflow is retained only as a reference artifact from an earlier design. The current direction is:

- n8n feeds the pending approval record
- Acumatica owns `Approve`
- Acumatica owns the final official CRM activity creation
- approved rows should not remain in the processing grid

## Current Dev Assumptions

The Acumatica HTTP nodes currently have `allowUnauthorizedCerts = true` because the dev environment is expected to use local or self-signed HTTPS.

For production:

- remove or disable that behavior
- move auth into proper n8n credentials or deployment-managed secrets
- confirm the final `Default` entity exposure and file-upload path against the implemented Acumatica extension
- finalize the remaining deferred transcript-file policy from `development/docs/deferred.md`

## Import Commands

Regenerate workflow JSON:

```bash
node /home/igorw/Work/acumatica/development/n8n/build-fireflies-opportunity-workflow.mjs
node /home/igorw/Work/acumatica/development/n8n/build-fireflies-mock-workflow.mjs
node /home/igorw/Work/acumatica/development/n8n/build-opportunity-summary-sync-workflow.mjs
node /home/igorw/Work/acumatica/development/n8n/simulate-fireflies-flow.mjs --output fireflies-mock-preview.best-guess.json
```

Import into local Dockerized n8n:

```bash
docker cp /home/igorw/Work/acumatica/development/n8n/fireflies-opportunity-meeting-notes-approval.workflow.json n8n:/tmp/fireflies-opportunity.workflow.json
docker exec n8n sh -lc 'n8n import:workflow --input=/tmp/fireflies-opportunity.workflow.json --projectId=DNPLHdu0cQi68Md0'

docker cp /home/igorw/Work/acumatica/development/n8n/fireflies-opportunity-meeting-notes-mock.workflow.json n8n:/tmp/fireflies-opportunity-mock.workflow.json
docker exec n8n sh -lc 'n8n import:workflow --input=/tmp/fireflies-opportunity-mock.workflow.json --projectId=DNPLHdu0cQi68Md0'

docker cp /home/igorw/Work/acumatica/development/n8n/opportunity-summary-sync.workflow.json n8n:/tmp/opportunity-summary-sync.workflow.json
docker exec n8n sh -lc 'n8n import:workflow --input=/tmp/opportunity-summary-sync.workflow.json --projectId=DNPLHdu0cQi68Md0'
```

Export all workflows:

```bash
docker exec n8n sh -lc 'n8n export:workflow --all --output=/tmp/all-workflows.json && sed -n "1,260p" /tmp/all-workflows.json'
```

## Example Fireflies Webhook Test Payload

```json
{
	"meetingId": "01KEG1NZ6RHJ7S3V71D4T70ZBJ",
	"eventType": "Transcription completed",
	"clientReferenceId": "fireflies-sample-20260109"
}
```

## Mock Workflow Usage

Use the mock workflow when you want to keep moving without a live Fireflies account.

What it does:

- starts from a manual trigger
- loads the checked-in current client Fireflies payload fixture
- runs the same normalization and opportunity-matching logic shape as the main workflow
- can call Acumatica to create the approval row and upload the generated `.html` transcript once the OAuth2 credential is attached
- emits:
  - `firefliesWebhookPayload`
  - `firefliesTranscriptResponse`
  - `acumaticaApprovalPayload`
  - candidate opportunity ranking
  - matched contacts

This lets you continue work on:

- Acumatica endpoint field mapping
- approval-record schema validation
- transcript attachment handling
- downstream payload inspection

without needing a live Fireflies tenant yet.

## One-Shot Local Simulation

Use the simulator when you want a deterministic output without depending on the n8n runner, browser session, or Fireflies.

Command:

```bash
node /home/igorw/Work/acumatica/development/n8n/simulate-fireflies-flow.mjs --output fireflies-mock-preview.best-guess.json
```

What it does:

- loads the checked-in webhook and transcript fixtures
- applies the same normalization and matching shape as the mock workflow
- emits the final approval payload preview to stdout
- optionally writes the same preview to a checked-in JSON artifact

This is the quickest way to validate field mapping while the real Fireflies payload and final n8n environment details are still unknown.

## Browser Testing Note

Manual Chrome testing currently hits an environment-level constraint:

- the browser can reach `http://172.17.0.1:5678`, but n8n redirects to sign-in because the instance is configured for secure cookies on an insecure origin
- the same Chrome session cannot reach `http://localhost:5678`, so the usual local-dev cookie exception is not available there

That means browser inspection is still useful for confirming the environment behavior, but deterministic payload validation should currently use the local simulator and the checked-in mock workflow artifacts.

## Known Gaps

1. The workflows are imported and structurally valid in n8n, but they have not yet been end-to-end executed against real Fireflies and live Acumatica credentials because the dev tenant still intermittently trips API-seat/session limits during automated login attempts.
2. The opportunity ranking step is still deterministic. If you want LLM-assisted ranking in v1, that still needs to replace or augment the current scoring node.
3. The downstream summary destination is intentionally generic. `OPPORTUNITY_SUMMARY_UPSERT_URL` still needs to point at the real RAG-summary writer once that service contract is finalized.
