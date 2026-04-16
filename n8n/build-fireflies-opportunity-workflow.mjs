import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workflowId = "5c7c4f1e-8f3d-4ec7-8fd8-72ec145f0c33";
const rootPath = resolve(fileURLToPath(new URL(".", import.meta.url)));
const outputPath = resolve(rootPath, "fireflies-opportunity-meeting-notes-approval.workflow.json");

const firefliesTranscriptQuery = [
	"query Transcript($transcriptId: String!) {",
	"\ttranscript(id: $transcriptId) {",
	"\t\tid",
	"\t\ttitle",
	"\t\tdate",
	"\t\torganizer_email",
	"\t\tparticipants",
	"\t\ttranscript_url",
	"\t\tduration",
	"\t\tsummary {",
	"\t\t\toverview",
	"\t\t\taction_items",
	"\t\t\tshorthand_bullet",
	"\t\t\tshort_summary",
	"\t\t\tshort_overview",
	"\t\t\ttopics_discussed",
	"\t\t}",
	"\t\tsentences {",
	"\t\t\tspeaker_name",
	"\t\t\ttext",
	"\t\t\tstart_time",
	"\t\t\tend_time",
	"\t\t}",
	"\t}",
	"}",
].join("\\n");

const canonicalizeFirefliesTranscriptCode = String.raw`
const input = $input.first()?.json ?? {};
const transcript = input?.data?.transcript;

if (!transcript) {
	throw new Error("Fireflies transcript response did not contain data.transcript");
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

const aggregateAndBuildPayloadCode = String.raw`
const attendeeItems = $('Normalize Fireflies Transcript').all();
const contactItems = $('Get Contacts').all();
const opportunityItems = $('Get Opportunities').all();
const webhookMetadata = $('Validate Fireflies Webhook').first()?.json ?? {};

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
	const contactsResponse = contactItems[index]?.json;
	const opportunitiesResponse = opportunityItems[index]?.json;

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
// Acumatica owns final confirmation. n8n may suggest a candidate, but Stephen must
// explicitly confirm or correct ConfirmedOpportunityID before approval.
const confirmedOpportunityID = null;
const participantEmails = Array.isArray(firstMeeting.participantEmails) ? firstMeeting.participantEmails : [];

const acumaticaApprovalPayload = {
	ExternalMeetingID: { value: firstMeeting.meetingId },
	ExternalClientReferenceID: { value: webhookMetadata.clientReferenceId || "" },
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
			externalMeetingID: firstMeeting.meetingId,
			externalClientReferenceID: webhookMetadata.clientReferenceId || "",
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

const workflow = [
	{
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
				type: "n8n-nodes-base.httpRequest",
				typeVersion: 4.4,
				position: [780, 300],
				parameters: {
					method: "POST",
					url: '={{ $env.FIREFLIES_GRAPHQL_URL || "https://api.fireflies.ai/graphql" }}',
					authentication: "none",
					sendHeaders: true,
					specifyHeaders: "keypair",
					headerParameters: {
						parameters: [
							{
								name: "Authorization",
								value: '={{ "Bearer " + $env.FIREFLIES_API_KEY }}',
							},
						],
					},
					sendBody: true,
					contentType: "json",
					specifyBody: "json",
					jsonBody: `={{ ({ query: ${JSON.stringify(firefliesTranscriptQuery)}, variables: { transcriptId: $json.meetingId } }) }}`,
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
				name: "Get Contacts",
				type: "n8n-nodes-base.httpRequest",
				typeVersion: 4.4,
				position: [1300, 300],
				parameters: {
					method: "GET",
					url: '={{ ($env.ACU_BASE_URL || "https://localhost:443") + "/" + ($env.ACU_INSTANCE_NAME || "demo") + "/entity/Default/25.200.001/Contact" }}',
					authentication: "genericCredentialType",
					genericAuthType: "oAuth2Api",
					sendQuery: true,
					queryParameters: {
						parameters: [
							{
								name: "$filter",
								value: '={{ "Email eq \'" + (($json.attendeeEmail || "__no_match__").replace(/\'/g, "\'\'")) + "\'" }}',
							},
						],
					},
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
			{
				id: "7",
				name: "Get Opportunities",
				type: "n8n-nodes-base.httpRequest",
				typeVersion: 4.4,
				position: [1560, 300],
				parameters: {
					method: "GET",
					url: '={{ ($env.ACU_BASE_URL || "https://localhost:443") + "/" + ($env.ACU_INSTANCE_NAME || "demo") + "/entity/Default/25.200.001/Opportunity" }}',
					authentication: "genericCredentialType",
					genericAuthType: "oAuth2Api",
					sendQuery: true,
					queryParameters: {
						parameters: [
							{
								name: "$select",
								value: "OpportunityID,BusinessAccount,Subject,Status",
							},
							{
								name: "$filter",
								value: "Status ne 'Lost' and Status ne 'Won'",
							},
						],
					},
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
			{
				id: "8",
				name: "Aggregate And Build Payload",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [1820, 300],
				parameters: {
					mode: "runOnceForAllItems",
					language: "javaScript",
					jsCode: aggregateAndBuildPayloadCode,
				},
			},
			{
				id: "10",
				name: "Create Approval Record",
				type: "n8n-nodes-base.httpRequest",
				typeVersion: 4.4,
				position: [2080, 300],
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
			"Fireflies Webhook": {
				main: [
					[
						{
							node: "Validate Fireflies Webhook",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Validate Fireflies Webhook": {
				main: [
					[
						{
							node: "Fetch Fireflies Transcript",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Fetch Fireflies Transcript": {
				main: [
					[
						{
							node: "Canonicalize Fireflies Transcript",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Canonicalize Fireflies Transcript": {
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
							node: "Get Contacts",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Get Contacts": {
				main: [
					[
						{
							node: "Get Opportunities",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Get Opportunities": {
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
		versionId: "2a6ecc01-d8bb-4640-b20c-51fffdca60a5",
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
