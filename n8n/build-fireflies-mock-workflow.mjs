import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workflowId = "c7d3a9e3-3d37-4dc5-bb52-f4c390c409ea";
const rootPath = resolve(fileURLToPath(new URL(".", import.meta.url)));
const outputPath = resolve(rootPath, "fireflies-opportunity-meeting-notes-mock.workflow.json");
const webhookFixture = JSON.parse(readFileSync(resolve(rootPath, "fireflies-webhook.best-guess.json"), "utf8"));
const transcriptFixture = JSON.parse(readFileSync(resolve(rootPath, "fireflies-transcript.best-guess.json"), "utf8"));

const normalizeTranscriptCode = String.raw`
const input = $input.first()?.json ?? {};
const transcript = Array.isArray(input) ? input[0] : input;

if (!transcript?.formattedTranscript) {
	throw new Error("Mock Fireflies transcript payload did not contain formattedTranscript");
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

const mockContactsCode = String.raw`
const attendeeEmail = String($json.attendeeEmail ?? "").toLowerCase();

const contactsByEmail = {
	"kyle@contou.com": [
		{
			ContactID: { value: "901" },
			DisplayName: { value: "Kyle Vanderstoep" },
			BusinessAccount: { value: "CONTOU" },
			BAccountID: { value: "610" },
			Email: { value: "kyle@contou.com" },
		},
	],
};

return {
	json: {
		records: contactsByEmail[attendeeEmail] ?? [],
	},
};
`;

const mockOpportunitiesCode = String.raw`
return {
	json: {
		records: [
	{
		OpportunityID: { value: "OP000104" },
		BusinessAccount: { value: "CONTOU" },
		Subject: { value: "Acumatica implementation and services rollout" },
		Status: { value: "Open" },
	},
	{
		OpportunityID: { value: "OP000145" },
		BusinessAccount: { value: "CONTOU" },
		Subject: { value: "Generic product inquiry" },
		Status: { value: "Open" },
	},
		],
	},
};
`;

const aggregateAndBuildPayloadCode = String.raw`
const attendeeItems = $('Normalize Fireflies Transcript').all();
const contactItems = $('Mock Contacts').all();
const opportunityItems = $('Mock Opportunities').all();

const readValue = (record, ...keys) => {
	if (!record || typeof record !== "object") {
		return null;
	}

	for (const key of keys) {
		if (!(key in record)) {
			continue;
		}

		const value = record[key];
		if (value && typeof value === "object" && "value" in value) {
			return value.value;
		}
		if (value !== undefined) {
			return value;
		}
	}

	return null;
};

const asArray = (value) => {
	if (Array.isArray(value)) {
		return value;
	}

	if (value == null) {
		return [];
	}

	return [value];
};

const toIntOrNull = (value) => {
	if (value == null || value === "") {
		return null;
	}

	const parsed = Number.parseInt(String(value), 10);
	return Number.isFinite(parsed) ? parsed : null;
};

const keywordSet = (value) => new Set(
	String(value ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((word) => word.length > 2),
);

const scoreOpportunity = (opportunity, matchCorpus, businessAccounts) => {
	let score = 0;
	const opportunitySubject = String(readValue(opportunity, "Subject", "subject") ?? "");
	const subjectKeywords = keywordSet(opportunitySubject);
	const corpusKeywords = keywordSet(matchCorpus);

	for (const word of subjectKeywords) {
		if (corpusKeywords.has(word)) {
			score += 5;
		}
	}

	const businessAccount = String(readValue(opportunity, "BusinessAccount", "businessAccount", "BAccountID", "bAccountID") ?? "");
	if (businessAccount && businessAccounts.has(businessAccount.toLowerCase())) {
		score += 20;
	}

	return score;
};

const firstMeeting = attendeeItems[0]?.json;
if (!firstMeeting) {
	throw new Error("No normalized Fireflies items were produced");
}

const unmatchedEmails = [];
const matchedContacts = [];
const businessAccounts = new Set();
const candidateOpportunities = [];

for (let index = 0; index < attendeeItems.length; index += 1) {
	const attendee = attendeeItems[index]?.json ?? {};
	const attendeeEmail = attendee.attendeeEmail;
	const contactsResponse = contactItems[index]?.json?.records ?? [];
	const opportunitiesResponse = opportunityItems[index]?.json?.records ?? [];

	const contacts = asArray(contactsResponse).filter((record) => record && typeof record === "object");
	if (attendeeEmail && contacts.length === 0) {
		unmatchedEmails.push(attendeeEmail);
	}

	for (const contact of contacts) {
		const businessAccount = readValue(contact, "BusinessAccount", "businessAccount", "BAccountID", "bAccountID");
		const contactID = readValue(contact, "id", "ContactID", "contactID");

		if (businessAccount) {
			businessAccounts.add(String(businessAccount).toLowerCase());
		}

		matchedContacts.push({
			attendeeEmail,
			contactID,
			businessAccount,
			displayName: readValue(contact, "DisplayName", "displayName", "FullName", "fullName"),
		});
	}

	for (const opportunity of asArray(opportunitiesResponse).filter((record) => record && typeof record === "object")) {
		const opportunityID = readValue(opportunity, "OpportunityID", "opportunityID");
		if (!opportunityID) {
			continue;
		}

		candidateOpportunities.push(opportunity);
	}
}

const dedupedOpportunities = Array.from(
	new Map(
		candidateOpportunities.map((opportunity) => [
			String(readValue(opportunity, "OpportunityID", "opportunityID")),
			opportunity,
		]),
	).values(),
);

const ranked = dedupedOpportunities
	.map((opportunity) => ({
		opportunity,
		opportunityID: String(readValue(opportunity, "OpportunityID", "opportunityID")),
		subject: String(readValue(opportunity, "Subject", "subject") ?? ""),
		businessAccount: String(readValue(opportunity, "BusinessAccount", "businessAccount", "BAccountID", "bAccountID") ?? ""),
		score: scoreOpportunity(opportunity, firstMeeting.matchCorpus, businessAccounts),
	}))
	.sort((left, right) => right.score - left.score);

const bestCandidate = ranked[0] ?? null;
const topCandidates = bestCandidate
	? ranked.filter((entry) => entry.score === bestCandidate.score)
	: [];
const hasUniqueBestCandidate = topCandidates.length === 1;
const suggestedOpportunityID = hasUniqueBestCandidate ? bestCandidate.opportunityID : null;
// Keep the mock aligned with the real workflow: suggestions are automatic, confirmation is not.
const confirmedOpportunityID = null;
const executionSuffix = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const externalMeetingID = firstMeeting.meetingId + "-mock-" + executionSuffix;
const externalClientReferenceID = ${JSON.stringify(webhookFixture.clientReferenceId ?? "fireflies-sample")} + "-" + executionSuffix;
const participantEmails = Array.isArray(firstMeeting.participantEmails) ? firstMeeting.participantEmails : [];

const acumaticaApprovalPayload = {
	ExternalMeetingID: { value: externalMeetingID },
	ExternalClientReferenceID: { value: externalClientReferenceID },
	MeetingDate: { value: firstMeeting.meetingDate },
	MeetingTitle: { value: firstMeeting.title },
	MeetingSummary: { value: firstMeeting.summaryText || "Meeting Notes Summary" },
	TranscriptHtml: { value: firstMeeting.transcriptHtml },
	TranscriptUrl: { value: firstMeeting.transcriptUrl || "" },
	OrganizerEmail: { value: firstMeeting.organizerEmail || "" },
	ParticipantEmails: { value: participantEmails.join(";") },
	MatchDiagnostics: {
		value: JSON.stringify({
			unmatchedEmails,
			matchedContacts,
			rankedCandidates: ranked.map((entry) => ({
				opportunityID: entry.opportunityID,
				subject: entry.subject,
				businessAccount: entry.businessAccount,
				score: entry.score,
			})),
			ambiguousTopCandidates: hasUniqueBestCandidate ? [] : topCandidates.map((entry) => ({
				opportunityID: entry.opportunityID,
				subject: entry.subject,
				businessAccount: entry.businessAccount,
				score: entry.score,
			})),
		}),
	},
};

if (suggestedOpportunityID) {
	acumaticaApprovalPayload.SuggestedOpportunityID = { value: suggestedOpportunityID };
}

if (confirmedOpportunityID) {
	acumaticaApprovalPayload.ConfirmedOpportunityID = { value: confirmedOpportunityID };
}

return [
	{
		json: {
			externalMeetingID,
			externalClientReferenceID,
			meetingDate: firstMeeting.meetingDate,
			meetingTitle: firstMeeting.title,
			meetingSummary: firstMeeting.summaryText || "Meeting Notes Summary",
			transcriptHtml: firstMeeting.transcriptHtml,
			transcriptFileName: firstMeeting.transcriptFileName,
			transcriptUrl: firstMeeting.transcriptUrl,
			organizerEmail: firstMeeting.organizerEmail,
			participantEmails,
			unmatchedEmails,
			matchedContacts,
			candidateOpportunities: ranked,
			suggestedOpportunityID,
			confirmedOpportunityID,
			acumaticaApprovalPayload,
		},
	},
];
`;

const finalPreviewCode = String.raw`
const payload = $('Aggregate And Build Payload').first()?.json ?? {};

return [
	{
		json: {
			firefliesWebhookPayload: ${JSON.stringify(webhookFixture)},
			firefliesTranscriptResponse: ${JSON.stringify(transcriptFixture)},
			acumaticaApprovalPayload: payload.acumaticaApprovalPayload ?? {},
			suggestedOpportunityID: payload.suggestedOpportunityID ?? null,
			confirmedOpportunityID: payload.confirmedOpportunityID ?? null,
			matchedContacts: payload.matchedContacts ?? [],
			candidateOpportunities: payload.candidateOpportunities ?? [],
			unmatchedEmails: payload.unmatchedEmails ?? [],
			transcriptFileName: payload.transcriptFileName ?? null,
			transcriptUrl: payload.transcriptUrl ?? null,
		},
	},
];
`;

const workflow = [
	{
		updatedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		id: workflowId,
		name: "Fireflies Opportunity Meeting Notes Mock",
		description: "Manual mock workflow that emits best-guess Fireflies webhook and transcript payloads, builds the downstream Acumatica approval payload, and creates a pending approval record through the LSOpportunityNotes endpoint. Acumatica persists the pending-review transcript as an approval-row .html attachment and renders TranscriptHtml from that file; approval creates the downstream CRActivity attachment.",
		active: false,
		isArchived: false,
		nodes: [
			{
				id: "1",
				name: "Manual Trigger",
				type: "n8n-nodes-base.manualTrigger",
				typeVersion: 1,
				position: [260, 300],
				parameters: {},
			},
			{
				id: "2",
				name: "Load Mock Transcript Response",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [520, 300],
				parameters: {
					mode: "runOnceForAllItems",
					language: "javaScript",
					jsCode: `return [{ json: ${JSON.stringify(Array.isArray(transcriptFixture) ? transcriptFixture[0] : transcriptFixture)} }];`,
				},
			},
			{
				id: "3",
				name: "Normalize Fireflies Transcript",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [780, 300],
				parameters: {
					mode: "runOnceForAllItems",
					language: "javaScript",
					jsCode: normalizeTranscriptCode,
				},
			},
			{
				id: "4",
				name: "Mock Contacts",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [1040, 300],
				parameters: {
					mode: "runOnceForEachItem",
					language: "javaScript",
					jsCode: mockContactsCode,
				},
			},
			{
				id: "5",
				name: "Mock Opportunities",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [1300, 300],
				parameters: {
					mode: "runOnceForEachItem",
					language: "javaScript",
					jsCode: mockOpportunitiesCode,
				},
			},
			{
				id: "6",
				name: "Aggregate And Build Payload",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [1560, 300],
				parameters: {
					mode: "runOnceForAllItems",
					language: "javaScript",
					jsCode: aggregateAndBuildPayloadCode,
				},
			},
			{
				id: "8",
				name: "Build Mock Preview",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [1820, 120],
				parameters: {
					mode: "runOnceForAllItems",
					language: "javaScript",
					jsCode: finalPreviewCode,
				},
			},
			{
				id: "9",
				name: "Create Approval Record",
				type: "n8n-nodes-base.httpRequest",
				typeVersion: 4.4,
				position: [1820, 320],
				parameters: {
					method: "PUT",
					url: '={{ ($env.ACU_BASE_URL || "https://localhost:443") + "/" + ($env.ACU_INSTANCE_NAME || "demo") + "/entity/" + ($env.ACU_APPROVAL_ENDPOINT_NAME || "LSOpportunityNotes") + "/" + ($env.ACU_APPROVAL_ENDPOINT_VERSION || "25.200.001") + "/OpportunityNotesApproval" }}',
					authentication: "genericCredentialType",
					genericAuthType: "oAuth2Api",
					sendBody: true,
					contentType: "json",
					specifyBody: "json",
					jsonBody: '={{ $("Aggregate And Build Payload").first().json.acumaticaApprovalPayload }}',
					options: {
						timeout: 60000,
						response: {
							response: {
								neverError: false,
								responseFormat: "json",
							},
						},
					},
				},
			},
		],
		connections: {
			"Manual Trigger": {
				main: [
					[
						{
							node: "Load Mock Transcript Response",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Load Mock Transcript Response": {
				main: [
					[
						{
							node: "Normalize Fireflies Transcript",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Normalize Fireflies Transcript": {
				main: [
					[
						{
							node: "Mock Contacts",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Mock Contacts": {
				main: [
					[
						{
							node: "Mock Opportunities",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Mock Opportunities": {
				main: [
					[
						{
							node: "Aggregate And Build Payload",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Aggregate And Build Payload": {
				main: [
					[
						{
							node: "Build Mock Preview",
							type: "main",
							index: 0,
						},
						{
							node: "Create Approval Record",
							type: "main",
							index: 0,
						},
					],
				],
			},
		},
		settings: {},
		staticData: null,
		meta: null,
		pinData: {},
		versionId: "2dd53d97-dc09-4691-9683-944f1cc3d937",
		activeVersionId: null,
		versionCounter: 1,
		triggerCount: 0,
		tags: [],
		versionMetadata: {
			name: null,
			description: null,
		},
	},
];

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(workflow, null, "\t")}\n`);

console.log(outputPath);
