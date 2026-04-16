import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootPath = resolve(fileURLToPath(new URL(".", import.meta.url)));
const args = process.argv.slice(2);

const options = new Map();
for (let index = 0; index < args.length; index += 1) {
	const current = args[index];
	if (!current.startsWith("--")) {
		continue;
	}

	const next = args[index + 1];
	if (next && !next.startsWith("--")) {
		options.set(current, next);
		index += 1;
		continue;
	}

	options.set(current, "true");
}

const webhookPath = resolve(rootPath, options.get("--webhook") ?? "fireflies-webhook.best-guess.json");
const transcriptPath = resolve(rootPath, options.get("--transcript") ?? "fireflies-transcript.best-guess.json");
const outputPath = options.get("--output") ? resolve(rootPath, options.get("--output")) : null;

const webhookFixture = JSON.parse(readFileSync(webhookPath, "utf8"));
const transcriptFixture = JSON.parse(readFileSync(transcriptPath, "utf8"));

const contactsByEmail = {
	"kyle@contou.com": [
		{
			ContactID: { value: "901" },
			DisplayName: { value: "Kyle Vanderstoep" },
			BusinessAccount: { value: "610" },
			BusinessAccountCD: { value: "CONTOU" },
			Email: { value: "kyle@contou.com" },
		},
	],
};

const openOpportunities = [
	{
		OpportunityID: { value: "OPP000451" },
		BusinessAccount: { value: "CONTOU" },
		Subject: { value: "Acumatica implementation for Contou Credit Union" },
		Status: { value: "Open" },
	},
	{
		OpportunityID: { value: "OPP000452" },
		BusinessAccount: { value: "CONTOU" },
		Subject: { value: "Corporate card reimbursement modernization" },
		Status: { value: "Open" },
	},
];

const transcript = Array.isArray(transcriptFixture) ? transcriptFixture[0] : transcriptFixture;
if (!transcript?.formattedTranscript) {
	throw new Error("Transcript fixture does not contain formattedTranscript");
}

const escapeHtml = (value) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

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

const keywordSet = (value) =>
	new Set(
		String(value ?? "")
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, " ")
			.split(/\s+/)
			.filter((word) => word.length > 2),
	);

const scoreOpportunity = (opportunity, matchCorpus, businessAccounts) => {
	let score = 0;
	const subject = String(readValue(opportunity, "Subject", "subject") ?? "");
	const subjectKeywords = keywordSet(subject);
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

const participantEmails = Array.from(new Set([...(Array.isArray(transcript.attendees) ? transcript.attendees : []), transcript.host].map(normalizeEmail).filter(Boolean)));

const externalParticipantEmails = participantEmails.filter((email) => !email.endsWith("@bpw.com"));
const summary = {
	overview: transcript.overview ?? "",
	action_items: transcript.actionItems ?? "",
	shorthand_bullet: transcript.shorthandBullet ?? transcript.bulletGist ?? "",
	short_summary: transcript.shortSummary ?? "",
	short_overview: transcript.gist ?? "",
	topics_discussed: transcript.keywords ?? [],
};
const transcriptHtml = String(transcript.formattedTranscript ?? "")
	.split(/\n{2,}/)
	.map((paragraph) => paragraph.trim())
	.filter(Boolean)
	.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`)
	.join("");

const meetingTitle = transcript.subject || "Meeting Notes Summary";
const meetingDate = transcript.date || new Date().toISOString();
const summaryText = [
	summary.overview,
	summary.short_summary,
	summary.short_overview,
]
	.filter(Boolean)
	.join("\n\n")
	.trim();

const transcriptFileName =
	[
		(meetingTitle || "meeting-notes")
			.replace(/[^A-Za-z0-9._-]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "")
			.toLowerCase() || "meeting-notes",
		".html",
	].join("");

const matchCorpus = [
	meetingTitle,
	summary.overview,
	summary.short_summary,
	summary.short_overview,
	summary.shorthand_bullet,
	Array.isArray(summary.topics_discussed) ? summary.topics_discussed.join(" ") : summary.topics_discussed,
]
	.filter(Boolean)
	.join(" ")
	.toLowerCase();

const unmatchedEmails = [];
const matchedContacts = [];
const businessAccounts = new Set();

for (const attendeeEmail of externalParticipantEmails) {
	const contacts = contactsByEmail[attendeeEmail] ?? [];
	if (contacts.length === 0) {
		unmatchedEmails.push(attendeeEmail);
		continue;
	}

	for (const contact of contacts) {
		const bAccountID = readValue(contact, "BusinessAccount", "businessAccount", "BAccountID", "bAccountID");
		const businessAccountCode = readValue(contact, "BusinessAccountCD", "businessAccountCD", "BAccountID", "bAccountID");
		const businessAccountMatchValue = businessAccountCode ?? bAccountID;

		if (businessAccountMatchValue) {
			businessAccounts.add(String(businessAccountMatchValue).toLowerCase());
		}

		matchedContacts.push({
			attendeeEmail,
			contactID: readValue(contact, "ContactID", "contactID", "id"),
			bAccountID,
			businessAccountCode,
			displayName: readValue(contact, "DisplayName", "displayName", "FullName", "fullName"),
		});
	}
}

const rankedCandidates = openOpportunities
	.map((opportunity) => ({
		opportunityID: String(readValue(opportunity, "OpportunityID", "opportunityID")),
		subject: String(readValue(opportunity, "Subject", "subject") ?? ""),
		businessAccount: String(readValue(opportunity, "BusinessAccount", "businessAccount") ?? ""),
		score: scoreOpportunity(opportunity, matchCorpus, businessAccounts),
	}))
	.sort((left, right) => right.score - left.score);

const bestCandidate = rankedCandidates[0] ?? null;
const topCandidates = bestCandidate
	? rankedCandidates.filter((entry) => entry.score === bestCandidate.score)
	: [];
const hasUniqueBestCandidate = topCandidates.length === 1;
const suggestedOpportunityID = hasUniqueBestCandidate ? bestCandidate.opportunityID : null;
const confirmedOpportunityID = null;
const primaryContact = matchedContacts[0] ?? null;
const subject = meetingTitle.slice(0, 255);

const preview = {
	firefliesWebhookPayload: webhookFixture,
	firefliesTranscriptResponse: transcriptFixture,
	acumaticaApprovalPayload: {
		ExternalMeetingID: { value: transcript.id },
		ExternalClientReferenceID: { value: webhookFixture.clientReferenceId ?? "" },
		MeetingDate: { value: meetingDate },
		MeetingTitle: { value: meetingTitle },
		MeetingSummary: { value: summaryText || "Meeting Notes Summary" },
		TranscriptHtml: { value: transcriptHtml },
		TranscriptUrl: { value: transcript.transcriptUrl || "" },
		OrganizerEmail: { value: normalizeEmail(transcript.host) },
		ParticipantEmails: { value: participantEmails.join(";") },
		BAccountID: { value: primaryContact?.bAccountID ?? "" },
		ContactID: { value: primaryContact?.contactID ?? "" },
		SuggestedOpportunityID: { value: suggestedOpportunityID ?? "" },
		ConfirmedOpportunityID: { value: confirmedOpportunityID ?? "" },
		MatchDiagnostics: {
			value: JSON.stringify({
				unmatchedEmails,
				matchedContacts,
				rankedCandidates,
				ambiguousTopCandidates: hasUniqueBestCandidate ? [] : topCandidates,
			}),
		},
		Subject: { value: subject },
	},
	suggestedOpportunityID,
	confirmedOpportunityID,
	matchedContacts,
	candidateOpportunities: rankedCandidates,
	unmatchedEmails,
	transcriptFileName,
	transcriptUrl: transcript.transcriptUrl || null,
};

const output = JSON.stringify(preview, null, "\t");

if (outputPath) {
	writeFileSync(outputPath, output + "\n", "utf8");
}

console.log(output);
