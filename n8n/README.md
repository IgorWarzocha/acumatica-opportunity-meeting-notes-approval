# n8n Workflows

This folder contains the final importable n8n workflow exports for the LS Opportunity Meeting Notes Approval package.

## Importable workflows

- `fireflies-opportunity-meeting-notes-approval.workflow.json`
  - Production Fireflies ingestion workflow.
  - Receives Fireflies webhook events, fetches the transcript with the Fireflies community node, normalizes the transcript, routes matching/creation through Claude AI Agent tools, and creates a pending Acumatica approval row.
- `opportunity-chat-claude.workflow.json`
  - Opportunity chat backend workflow.
  - Receives chat requests from Acumatica, validates the shared secret, uses Claude AI Agent with GET-only Acumatica tools, and returns an answer.

Both workflow JSON files are exported as single workflow objects, not arrays, so they can be imported directly through the n8n UI.

## Fireflies workflow shape

```text
Fireflies Webhook
  → Validate Fireflies Webhook
  → Fetch Fireflies Transcript
  → Canonicalize Fireflies Transcript
  → Normalize Fireflies Transcript
  → AI Agent / Claude
       ↳ get_contact_from_acumatica
       ↳ get_opportunities_from_acumatica
       ↳ create_opportunity_meeting_notes_approval
```

The webhook responds `202 Accepted` after accepting the event. Downstream processing status is tracked by n8n execution status. The workflow settings retain success/error execution data and progress for troubleshooting.

## Required n8n credentials

After import, assign credentials in the client n8n instance:

### Fireflies workflow

- `Fetch Fireflies Transcript` → Fireflies credential (`firefliesApi`)
- `Anthropic Chat Model` → Anthropic credential
- `get_contact_from_acumatica` → Acumatica OAuth2 credential
- `get_opportunities_from_acumatica` → Acumatica OAuth2 credential
- `create_opportunity_meeting_notes_approval` → Acumatica OAuth2 credential

### Opportunity chat workflow

- `Anthropic Chat Model` → Anthropic credential
- `get_opportunity_context` → Acumatica OAuth2 credential
- `get_related_meeting_notes` → Acumatica OAuth2 credential

## Required variables / environment

Set these in the client n8n environment or n8n variables, matching the expressions used by the workflows:

- `ACU_BASE_URL`
  - Example: `https://client.example.com`
- `ACU_INSTANCE_NAME`
  - Example: `AcumaticaERP` or the site/tenant path segment used in the client's URL layout.
- `ACU_APPROVAL_ENDPOINT_NAME`
  - Default: `LSOpportunityNotes`
- `ACU_APPROVAL_ENDPOINT_VERSION`
  - Default: `25.200.001`
- `ACUMATICA_BASE_URL`
  - Used by the chat workflow.
  - Example: `https://client.example.com/AcumaticaERP`
- `LS_N8N_CLIENT_SECRET`
  - Shared secret configured in Acumatica Opportunity Chat Setup and validated by the chat webhook.

## Webhook endpoints

- Fireflies ingestion:
  - `POST /webhook/fireflies/opportunity-meeting-notes-approval`
- Opportunity chat:
  - `POST /webhook/ls-opportunity-chat`

## Regenerating workflow JSON

```bash
node n8n/build-fireflies-opportunity-workflow.mjs
node n8n/build-opportunity-chat-workflow.mjs
python3 -m json.tool n8n/fireflies-opportunity-meeting-notes-approval.workflow.json >/dev/null
python3 -m json.tool n8n/opportunity-chat-claude.workflow.json >/dev/null
```

## Notes

- The Fireflies transcript node output shape is treated as the supported production shape.
- The Acumatica approval row is created through `LSOpportunityNotes/25.200.001/OpportunityNotesApproval`.
- Acumatica remains the system of record for approval state, transcript attachment persistence, and downstream CRM activity creation after user approval.
- The opportunity chat workflow uses GET-only Acumatica tools and does not mutate opportunities or create activities.
