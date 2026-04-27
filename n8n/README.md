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
  - Importable mock workflow export that produces best-guess Fireflies and Acumatica payloads without calling Fireflies, and can post the pending approval row into Acumatica once an OAuth2 credential is attached.
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
## Current Source of Truth

Use the March 27, 2026 client conversation as the authoritative contract when older repo notes disagree.

- Fireflies goes through `n8n` only.
- `n8n` creates the pending `OpportunityNotesApproval` row.
- the approval-row attached transcript `.html` file is the persisted pending-review source of truth.
- `TranscriptHtml` is only a transient API/UI projection used to seed or edit that attachment.
- Acumatica `Approve` creates the official `CRActivity` on the confirmed opportunity.
- During `Approve`, Acumatica generates the transcript attachment onto the created `CRActivity`.
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

The live workflow uses the installed community Fireflies node:

- `@firefliesai/n8n-nodes-fireflies.fireflies`
- node operation: `Transcript` → `Get`

Create/attach an n8n credential of type `firefliesApi` to the `Fetch Fireflies Transcript` node. The old raw HTTP GraphQL node is no longer used for transcript fetches.

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
- only sends `SuggestedOpportunityID`; Acumatica derives account/contact from `ConfirmedOpportunityID` during approval

This is a practical dev-safe placeholder. It is not the final LLM-assisted ranking step described in the PRD.

## Current Approval Contract

The target contract is the custom `LSOpportunityNotes` endpoint:

- read contacts:
  - `GET /entity/Default/25.200.001/Contact`
- read opportunities:
  - `GET /entity/Default/25.200.001/Opportunity`
- create approval row:
  - `PUT /entity/LSOpportunityNotes/25.200.001/OpportunityNotesApproval`

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
- `SuggestedOpportunityID`
- `ConfirmedOpportunityID`
- `MatchDiagnostics`

`ConfirmedOpportunityID` is intentionally sent blank. n8n only proposes `SuggestedOpportunityID`; Stephen confirms or corrects the real opportunity inside Acumatica before approval.

`TranscriptHtml` is accepted as transient input. Acumatica persists the canonical approval-row transcript as an attached `.html` file and renders the Transcript tab back from that file.

## Dev Execution Notes For This Workspace

These are specific to the current local n8n container and are now part of the documented workflow because we hit them multiple times.

- The checked-in workflow JSON may use `$env...` expressions for endpoint selection, but this local n8n instance blocks env access inside workflow expressions (`N8N_BLOCK_ENV_ACCESS_IN_NODE`).
- For the current local runtime, the imported workflow should use the concrete Acumatica URL:
  - `http://172.17.0.3/AcumaticaERP/entity/LSOpportunityNotes/25.200.001/OpportunityNotesApproval`
- One-shot CLI execution from a separate temporary n8n container can fail if the workflow relies on stored OAuth credentials, because that execution path may not initialize the same license/provider state used by the long-running container.
- The reliable local dev path was:
  1. export/import the workflow through the running `n8n` container
  2. attach the existing `Acumatica OAuth` credential to Acumatica HTTP nodes and a `firefliesApi` credential to the Fireflies node
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

The created approval row keeps the transcript attached as an approval-row `.html` file for review before approval. The Transcript tab renders from that attachment. On approve, Acumatica creates the transcript attachment onto the resulting `CRActivity`.

## Import Commands

Regenerate workflow JSON:

```bash
node /home/igorw/Work/acumatica/development/package/ls-opportunity-meeting-notes-approval/n8n/build-fireflies-opportunity-workflow.mjs
node /home/igorw/Work/acumatica/development/package/ls-opportunity-meeting-notes-approval/n8n/build-fireflies-mock-workflow.mjs
node /home/igorw/Work/acumatica/development/package/ls-opportunity-meeting-notes-approval/n8n/simulate-fireflies-flow.mjs --output fireflies-mock-preview.best-guess.json
```

Import into local Dockerized n8n:

```bash
docker cp /home/igorw/Work/acumatica/development/package/ls-opportunity-meeting-notes-approval/n8n/fireflies-opportunity-meeting-notes-approval.workflow.json n8n:/tmp/fireflies-opportunity.workflow.json
docker exec n8n sh -lc 'n8n import:workflow --input=/tmp/fireflies-opportunity.workflow.json --projectId=DNPLHdu0cQi68Md0'

docker cp /home/igorw/Work/acumatica/development/package/ls-opportunity-meeting-notes-approval/n8n/fireflies-opportunity-meeting-notes-mock.workflow.json n8n:/tmp/fireflies-opportunity-mock.workflow.json
docker exec n8n sh -lc 'n8n import:workflow --input=/tmp/fireflies-opportunity-mock.workflow.json --projectId=DNPLHdu0cQi68Md0'
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

## Live Fireflies Workflow Usage

The live workflow now uses the Fireflies community node instead of a hand-built GraphQL HTTP request.

After import, configure credentials:

- `Fetch Fireflies Transcript` → Fireflies credential (`firefliesApi`)
- `Get Contacts`, `Get Opportunities`, `Create Approval Record` → Acumatica OAuth2 credential

The Fireflies webhook still starts at:

- `POST /webhook/fireflies/opportunity-meeting-notes-approval`

Expected webhook payload still only needs a transcript/meeting ID, e.g.:

```json
{
	"meetingId": "01KEG1NZ6RHJ7S3V71D4T70ZBJ",
	"eventType": "Transcription completed",
	"clientReferenceId": "fireflies-sample-20260109"
}
```

The Fireflies node returns the transcript under `data`; the workflow treats that Fireflies node output as the only supported live shape.

## Mock Workflow Usage

Use the mock workflow when you want to keep moving without a live Fireflies account.

What it does:

- starts from a manual trigger
- loads the checked-in current client Fireflies payload fixture
- runs the same normalization and opportunity-matching logic shape as the main workflow
- can call Acumatica to create the approval row once the OAuth2 credential is attached
- emits:
  - `firefliesWebhookPayload`
  - `firefliesTranscriptResponse`
  - `acumaticaApprovalPayload`
  - candidate opportunity ranking
  - matched contacts

This lets you continue work on:

- Acumatica endpoint field mapping
- approval-record schema validation
- activity attachment generation during approval
- downstream payload inspection

without needing a live Fireflies tenant yet.

## One-Shot Local Simulation

Use the simulator when you want a deterministic output without depending on the n8n runner, browser session, or Fireflies.

Command:

```bash
node /home/igorw/Work/acumatica/development/package/ls-opportunity-meeting-notes-approval/n8n/simulate-fireflies-flow.mjs --output fireflies-mock-preview.best-guess.json
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

## Opportunity Chat Side Panel Backend

The Opportunity chatbot is read-only. Chat history is persisted in Acumatica custom tables:

- `LSOpportunityChatSession`
- `LSOpportunityChatMessage`

The side-panel screen posts the user's message plus the current Opportunity FK context to the n8n webhook configured in `LSOpportunityChatSetup`.

n8n workflow artifact:

- `n8n/opportunity-chat-claude.workflow.json`
- builder: `n8n/build-opportunity-chat-workflow.mjs`

Required n8n configuration, as either environment variables or n8n variables:

- `ACUMATICA_BASE_URL` — base URL visible from the n8n container, including the Acumatica instance path, for example `http://host.docker.internal:38121/AcumaticaERP` if that route is reachable
- `LS_N8N_CLIENT_SECRET` — must match `N8nClientSecret` configured on `LS501030`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` optional, default `claude-3-5-sonnet-latest`
- `ANTHROPIC_MAX_TOKENS` optional, default `1200`

After import, attach the existing Acumatica OAuth2 credential to both Acumatica HTTP Request nodes:

- `GET Opportunity Context`
- `GET Related Meeting Notes and Transcripts`

The workflow is sequential: validate request → GET Opportunity context → GET related approval/transcript rows → build Claude prompt → call Anthropic → return `{ answer }`.

Runtime contract from Acumatica to n8n:

```json
{
  "clientSecret": "shared n8n external app client secret",
  "chatSessionID": 123,
  "message": "user question",
  "opportunity": {
    "opportunityID": "OP000123",
    "classID": "DEFAULT",
    "opportunityAddressID": 1,
    "opportunityContactID": 2,
    "shipAddressID": 3,
    "shipContactID": 4,
    "billAddressID": 5,
    "billContactID": 6,
    "contactID": 7,
    "bAccountID": 8,
    "parentBAccountID": 9,
    "locationID": 10,
    "taxZoneID": "DEFAULT",
    "curyID": "USD",
    "curyInfoID": 11,
    "ownerID": 12,
    "workgroupID": 13,
    "salesTerritoryID": "WEST"
  }
}
```

n8n validates `clientSecret`, then uses the attached OAuth credential to perform **GET-only** calls to Acumatica:

- `GET /entity/LSOpportunityNotes/25.200.001/OpportunityChatContext/{OpportunityID}`
- `GET /entity/LSOpportunityNotes/25.200.001/OpportunityNotesApproval?$filter=ConfirmedOpportunityID eq '{OpportunityID}'`

The second call is where transcript content comes from. Fireflies remains the ingestion source only; after ingestion, Acumatica is the system of record. The transcript is read from the approval-row attachment-backed `TranscriptHtml` projection.

The workflow calls Claude through Anthropic's `/v1/messages` endpoint and returns:

```json
{ "answer": "assistant response" }
```

No POST, PUT, or DELETE Acumatica tools are included in the chat workflow.
