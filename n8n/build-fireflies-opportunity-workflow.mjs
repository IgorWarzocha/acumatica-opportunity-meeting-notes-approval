import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workflowId = "5c7c4f1e-8f3d-4ec7-8fd8-72ec145f0c33";
const rootPath = resolve(fileURLToPath(new URL(".", import.meta.url)));
const outputPath = resolve(rootPath, "fireflies-opportunity-meeting-notes-approval.workflow.json");

const canonicalizeFirefliesTranscriptCode = String.raw`
const input = $input.first()?.json ?? {};
const transcript = input?.data;

if (!transcript) {
	throw new Error("Fireflies transcript node response did not contain data");
}

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const asArray = (value) => {
	if (Array.isArray(value)) {
		return value;
	}

	if (value == null || value === "") {
		return [];
	}

	return [value];
};

const participantEmails = Array.from(
	new Set(
		asArray(transcript.participants)
			.flatMap((participant) => {
				if (typeof participant === "string") {
					return [participant];
				}

				if (participant && typeof participant === "object") {
					return [
						participant.email,
						participant.emailAddress,
						participant.email_address,
						participant.user_email,
					].filter(Boolean);
				}

				return [];
			})
			.map(normalizeEmail)
			.filter(Boolean),
	),
);

const sentences = Array.isArray(transcript.sentences) ? transcript.sentences : [];
const groupedSentences = [];

for (const sentence of sentences) {
	const speakerName = String(sentence?.speaker_name ?? "Unknown Speaker").trim() || "Unknown Speaker";
	const text = String(sentence?.text ?? sentence?.raw_text ?? sentence?.ai_filters?.text_cleanup ?? "").trim();

	if (!text) {
		continue;
	}

	const currentGroup = groupedSentences[groupedSentences.length - 1];
	if (currentGroup && currentGroup.speakerName === speakerName) {
		currentGroup.parts.push(text);
		continue;
	}

	groupedSentences.push({
		speakerName,
		parts: [text],
	});
}

const formattedTranscript = groupedSentences
	.map((group) => "**" + group.speakerName + ":** " + group.parts.join(" "))
	.join("\\n\\n");

const summary = transcript.summary ?? {};
const actionItems = Array.isArray(summary.action_items)
	? summary.action_items.map((item) => "- " + String(item ?? "").trim()).filter((item) => item !== "- ").join("\\n")
	: String(summary.action_items ?? "");

return [
	{
		json: {
			id: transcript.id,
			formattedTranscript,
			attendees: participantEmails,
			date: transcript.date ?? "",
			host: normalizeEmail(transcript.organizer_email),
			subject: transcript.title ?? "Meeting Notes Summary",
			keywords: Array.isArray(summary.topics_discussed) ? summary.topics_discussed : [],
			actionItems,
			shorthandBullet: summary.shorthand_bullet ?? "",
			overview: summary.overview ?? "",
			bulletGist: summary.shorthand_bullet ?? "",
			gist: summary.short_overview ?? "",
			shortSummary: summary.short_summary ?? "",
			transcriptUrl: transcript.transcript_url ?? "",
			duration: transcript.duration ?? null,
		},
	},
];
`;

const normalizeTranscriptCode = String.raw`
const input = $input.first()?.json ?? {};
const transcript = Array.isArray(input) ? input[0] : input;

if (!transcript?.formattedTranscript) {
	throw new Error("Canonical Fireflies transcript payload did not contain formattedTranscript");
}

const escapeHtml = (value) => String(value ?? "")
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;")
	.replace(/'/g, "&#39;");

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const asArray = (value) => {
	if (Array.isArray(value)) {
		return value;
	}

	if (value == null || value === "") {
		return [];
	}

	return [value];
};

const markdownParagraphsToHtml = (value) =>
	String(value ?? "")
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
		.map((paragraph) => {
			const escaped = escapeHtml(paragraph).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
			return "<p>" + escaped + "</p>";
		})
		.join("");

const participantEmails = Array.from(new Set([...asArray(transcript.attendees), transcript.host].map(normalizeEmail).filter(Boolean)));

const externalEmails = participantEmails.filter((email) => !email.endsWith("@bpw.com"));

const summary = {
	overview: transcript.overview ?? "",
	action_items: transcript.actionItems ?? "",
	shorthand_bullet: transcript.shorthandBullet ?? transcript.bulletGist ?? "",
	short_summary: transcript.shortSummary ?? "",
	short_overview: transcript.gist ?? "",
	topics_discussed: transcript.keywords ?? [],
};

const transcriptHtml = markdownParagraphsToHtml(transcript.formattedTranscript);

const title = transcript.subject || "Meeting Notes Summary";
const meetingDate = transcript.date || new Date().toISOString();
const summaryText = [
	summary.overview,
	summary.short_summary,
	summary.short_overview,
]
	.filter(Boolean)
	.join("\\n\\n")
	.trim();

const transcriptFileName = [
	(title || "meeting-notes")
		.replace(/[^A-Za-z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase() || "meeting-notes",
	".html",
].join("");

const basePayload = {
	meetingId: transcript.id,
	title,
	meetingDate,
	organizerEmail: normalizeEmail(transcript.host),
	participantEmails,
	externalParticipantEmails: externalEmails,
	transcriptUrl: transcript.transcriptUrl || "",
	duration: transcript.duration ?? null,
	summary,
	summaryText,
	transcriptHtml,
	transcriptFileName,
	matchCorpus: [
		title,
		summary.overview,
		summary.short_summary,
		summary.short_overview,
		summary.shorthand_bullet,
		Array.isArray(summary.topics_discussed) ? summary.topics_discussed.join(" ") : summary.topics_discussed,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase(),
};

if (externalEmails.length === 0) {
	return [
		{
			json: {
				...basePayload,
				attendeeEmail: null,
			},
		},
	];
}

return externalEmails.map((attendeeEmail) => ({
	json: {
		...basePayload,
		attendeeEmail,
	},
}));
`;

const validateWebhookCode = String.raw`
const input = $input.first()?.json ?? {};
const body = input && typeof input.body === "object" && input.body !== null ? input.body : input;
const meetingId = body.meetingId || body.meetingID;

if (!meetingId) {
	throw new Error("Fireflies webhook payload did not contain meetingId");
}

return [
	{
		json: {
			meetingId: String(meetingId),
			eventType: body.eventType || body.event || "",
			clientReferenceId: body.clientReferenceId || body.client_reference_id || "",
			rawPayload: body,
		},
	},
];
`;

const firefliesApprovalAgentPrompt = String.raw`
You are an automation agent that processes Fireflies meeting transcripts and creates Acumatica Opportunity Meeting Notes Approval records.

Use the provided normalized transcript JSON as the source of truth.

Required workflow:
1. Identify external attendee emails from externalParticipantEmails. Do not query or match @bpw.com host emails.
2. For each external email, call get_contact_from_acumatica to find the matching Acumatica contact and Business Account.
3. Call get_opportunities_from_acumatica to retrieve open opportunities. Select the best matching opportunity using Business Account first, then meeting subject, summary, keywords, and transcript content.
4. If no confident opportunity match exists, still create the approval record with ConfirmedOpportunityID blank and include the best SuggestedOpportunityID only when defensible.
5. Call create_opportunity_meeting_notes_approval exactly once with an Acumatica payload for the LSOpportunityNotes endpoint.

Payload requirements for create_opportunity_meeting_notes_approval:
- ExternalMeetingID.value = meetingId
- MeetingTitle.value = title
- MeetingDate.value = meetingDate
- OrganizerEmail.value = organizerEmail
- ParticipantEmails.value = participantEmails joined by comma and space
- SuggestedOpportunityID.value = selected OpportunityID, or omit/blank if no defensible match
- ConfirmedOpportunityID.value = blank unless the match is certain enough to route directly to that opportunity
- Status.value = "P"
- TranscriptHtml.value = transcriptHtml
- Summary.value = summaryText

Return a concise JSON-like result describing created/skipped status and selected opportunity. Do not create CRM activities directly. The Acumatica approval screen handles user review and downstream activity creation.

Here is the normalized Fireflies transcript JSON:
{{ $json.toJsonString() }}
`;

const workflow = {
		updatedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		id: workflowId,
		name: "Fireflies Opportunity Meeting Notes Approval",
		description: "Receives Fireflies webhook events, fetches transcript data, suggests an Acumatica opportunity, and creates a pending approval record through the LSOpportunityNotes endpoint. Acumatica persists the pending-review transcript as an approval-row .html attachment and renders TranscriptHtml from that file; approval creates the downstream CRActivity attachment.",
		active: false,
		isArchived: false,
		nodes: [
			{
				id: "1",
				name: "Fireflies Webhook",
				type: "n8n-nodes-base.webhook",
				typeVersion: 2.1,
				position: [260, 300],
				parameters: {
					httpMethod: "POST",
					path: "fireflies/opportunity-meeting-notes-approval",
					responseMode: "onReceived",
					options: {
						responseCode: {
							values: {
								responseCode: 202,
							},
						},
						responseData: "{\"status\":\"accepted\"}",
					},
				},
			},
			{
				id: "2",
				name: "Validate Fireflies Webhook",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [520, 300],
				parameters: {
					mode: "runOnceForAllItems",
					language: "javaScript",
					jsCode: validateWebhookCode,
				},
			},
			{
				id: "3",
				name: "Fetch Fireflies Transcript",
				type: "@firefliesai/n8n-nodes-fireflies.fireflies",
				typeVersion: 1,
				position: [780, 300],
				parameters: {
					resource: "transcript",
					operation: "getTranscript",
					transcriptId: "={{ $json.meetingId }}",
				},
				credentials: {
					firefliesApi: {
						id: "",
						name: "Fireflies API",
					},
				},
			},
			{
				id: "4",
				name: "Canonicalize Fireflies Transcript",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [910, 300],
				parameters: {
					mode: "runOnceForAllItems",
					language: "javaScript",
					jsCode: canonicalizeFirefliesTranscriptCode,
				},
			},
			{
				id: "5",
				name: "Normalize Fireflies Transcript",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [1130, 300],
				parameters: {
					mode: "runOnceForAllItems",
					language: "javaScript",
					jsCode: normalizeTranscriptCode,
				},
			},
			{
				id: "6",
				name: "AI Agent",
				type: "@n8n/n8n-nodes-langchain.agent",
				typeVersion: 3.1,
				position: [1360, 300],
				parameters: {
					promptType: "define",
					text: `=${firefliesApprovalAgentPrompt}`,
					hasOutputParser: false,
					needsFallback: false,
					options: {
						systemMessage: "You orchestrate Fireflies transcript ingestion into Acumatica. Use the available Acumatica tools for contact lookup, opportunity lookup, and approval-record creation. Never create CRM activities directly.",
						maxIterations: 8,
						returnIntermediateSteps: false,
						enableStreaming: false,
					},
				},
			},
			{
				id: "7",
				name: "Anthropic Chat Model",
				type: "@n8n/n8n-nodes-langchain.lmChatAnthropic",
				typeVersion: 1.3,
				position: [1360, 560],
				parameters: {
					model: {
						mode: "list",
						value: "claude-sonnet-4-5-20250929",
						cachedResultName: "Claude Sonnet 4.5",
					},
					options: {
						maxTokensToSample: 1800,
					},
				},
				credentials: {
					anthropicApi: {
						id: "l9RIE8TC7FUqezEI",
						name: "Anthropic account",
					},
				},
			},
			{
				id: "8",
				name: "get_contact_from_acumatica",
				type: "n8n-nodes-base.httpRequestTool",
				typeVersion: 4.4,
				position: [1100, 560],
				parameters: {
					toolDescription: "GET Acumatica Contact by exact email. Input email must be an external attendee email, never an @bpw.com host email. Returns Contact fields including BusinessAccount when available.",
					method: "GET",
					url: '={{ ($env.ACU_BASE_URL || "https://localhost:443") + "/" + ($env.ACU_INSTANCE_NAME || "demo") + "/entity/Default/25.200.001/Contact" }}',
					authentication: "genericCredentialType",
					genericAuthType: "oAuth2Api",
					sendQuery: true,
					queryParameters: {
						parameters: [
							{
								name: "$filter",
								value: '={{ "Email eq \'" + $fromAI("email", "External attendee email address to look up", "string").replace(/\'/g, "\'\'") + "\'" }}',
							},
						],
					},
					options: { timeout: 60000 },
				},
				credentials: {
					oAuth2Api: { id: "f4ac1647-48e9-4a7b-876e-1a6fd7c0c146", name: "Acumatica OAuth" },
				},
			},
			{
				id: "9",
				name: "get_opportunities_from_acumatica",
				type: "n8n-nodes-base.httpRequestTool",
				typeVersion: 4.4,
				position: [1620, 560],
				parameters: {
					toolDescription: "GET open Acumatica opportunities. Use Contact/Business Account lookup results plus meeting content to choose the best OpportunityID. Does not mutate data.",
					method: "GET",
					url: '={{ ($env.ACU_BASE_URL || "https://localhost:443") + "/" + ($env.ACU_INSTANCE_NAME || "demo") + "/entity/Default/25.200.001/Opportunity" }}',
					authentication: "genericCredentialType",
					genericAuthType: "oAuth2Api",
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: "$select", value: "OpportunityID,BusinessAccount,Subject,Status" },
							{ name: "$filter", value: "Status ne 'Lost' and Status ne 'Won'" },
						],
					},
					options: { timeout: 60000 },
				},
				credentials: {
					oAuth2Api: { id: "f4ac1647-48e9-4a7b-876e-1a6fd7c0c146", name: "Acumatica OAuth" },
				},
			},
			{
				id: "10",
				name: "create_opportunity_meeting_notes_approval",
				type: "n8n-nodes-base.httpRequestTool",
				typeVersion: 4.4,
				position: [1880, 560],
				parameters: {
					toolDescription: "PUT one pending LSOpportunityNotes OpportunityNotesApproval record. Body must be Acumatica JSON with .value wrappers. This creates only the approval queue row; Acumatica creates the CRM activity later after user approval.",
					method: "PUT",
					url: '={{ ($env.ACU_BASE_URL || "https://localhost:443") + "/" + ($env.ACU_INSTANCE_NAME || "demo") + "/entity/" + ($env.ACU_APPROVAL_ENDPOINT_NAME || "LSOpportunityNotes") + "/" + ($env.ACU_APPROVAL_ENDPOINT_VERSION || "25.200.001") + "/OpportunityNotesApproval" }}',
					authentication: "genericCredentialType",
					genericAuthType: "oAuth2Api",
					sendBody: true,
					contentType: "json",
					specifyBody: "json",
					jsonBody: '={{ $fromAI("approvalPayload", "Complete Acumatica OpportunityNotesApproval JSON body using .value wrappers", "json") }}',
					options: { timeout: 60000 },
				},
				credentials: {
					oAuth2Api: { id: "f4ac1647-48e9-4a7b-876e-1a6fd7c0c146", name: "Acumatica OAuth" },
				},
			},
		],
		connections: {
			"Fireflies Webhook": {
				main: [[{ node: "Validate Fireflies Webhook", type: "main", index: 0 }]],
			},
			"Validate Fireflies Webhook": {
				main: [[{ node: "Fetch Fireflies Transcript", type: "main", index: 0 }]],
			},
			"Fetch Fireflies Transcript": {
				main: [[{ node: "Canonicalize Fireflies Transcript", type: "main", index: 0 }]],
			},
			"Canonicalize Fireflies Transcript": {
				main: [[{ node: "Normalize Fireflies Transcript", type: "main", index: 0 }]],
			},
			"Normalize Fireflies Transcript": {
				main: [[{ node: "AI Agent", type: "main", index: 0 }]],
			},
			"Anthropic Chat Model": {
				ai_languageModel: [[{ node: "AI Agent", type: "ai_languageModel", index: 0 }]],
			},
			"get_contact_from_acumatica": {
				ai_tool: [[{ node: "AI Agent", type: "ai_tool", index: 0 }]],
			},
			"get_opportunities_from_acumatica": {
				ai_tool: [[{ node: "AI Agent", type: "ai_tool", index: 0 }]],
			},
			"create_opportunity_meeting_notes_approval": {
				ai_tool: [[{ node: "AI Agent", type: "ai_tool", index: 0 }]],
			},
		},
		settings: {
			executionOrder: "v1",
			saveDataErrorExecution: "all",
			saveDataSuccessExecution: "all",
			saveExecutionProgress: true,
			saveManualExecutions: true,
			executionTimeout: 300,
		},
		staticData: null,
		meta: null,
		pinData: {},
		versionId: "2a6ecc01-d8bb-4640-b20c-51fffdca60a5",
		activeVersionId: null,
		versionCounter: 1,
		triggerCount: 0,
		tags: [],
		versionMetadata: {
			name: null,
			description: null,
		},
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(workflow, null, "\t")}\n`);

console.log(outputPath);
