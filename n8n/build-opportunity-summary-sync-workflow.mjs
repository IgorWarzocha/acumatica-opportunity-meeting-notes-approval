import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workflowId = "f251dd7b-9f0d-4cb1-bd6e-2d8a68c00d46";
const rootPath = resolve(fileURLToPath(new URL(".", import.meta.url)));
const outputPath = resolve(rootPath, "opportunity-summary-sync.workflow.json");

const normalizeApprovedRecordsCode = String.raw`
const input = $input.first()?.json ?? [];
const records = Array.isArray(input) ? input : [input];

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

return records
	.filter((record) => readValue(record, "ApprovalID"))
	.map((record) => ({
		json: {
			approvalId: String(readValue(record, "ApprovalID")),
			externalMeetingID: readValue(record, "ExternalMeetingID") || "",
			externalClientReferenceID: readValue(record, "ExternalClientReferenceID") || "",
			confirmedOpportunityID: readValue(record, "ConfirmedOpportunityID") || "",
			businessAccountID: readValue(record, "BusinessAccountID") || "",
			contactID: readValue(record, "ContactID") || "",
			activityNoteID: readValue(record, "ActivityNoteID") || "",
			meetingDate: readValue(record, "MeetingDate") || "",
			meetingTitle: readValue(record, "MeetingTitle") || "",
			meetingSummary: readValue(record, "MeetingSummary") || "",
			transcriptHtml: readValue(record, "TranscriptHtml") || "",
			transcriptUrl: readValue(record, "TranscriptUrl") || "",
			matchDiagnostics: readValue(record, "MatchDiagnostics") || "",
			approvedDateTime: readValue(record, "ApprovedDateTime") || "",
		},
	}));
`;

const buildSummaryRequestCode = String.raw`
const row = $input.first()?.json ?? {};

return [
	{
		json: {
			approvalId: row.approvalId,
			acumaticaSyncPayload: {
				ApprovalID: { value: row.approvalId },
				PostApprovalSyncStatus: { value: "S" },
				PostApprovalSyncDateTime: { value: new Date().toISOString() },
				PostApprovalSyncError: { value: "" },
				Processed: { value: true },
			},
			summaryUpsertPayload: {
				opportunityId: row.confirmedOpportunityID,
				approvalId: row.approvalId,
				externalMeetingId: row.externalMeetingID,
				externalClientReferenceId: row.externalClientReferenceID,
				businessAccountId: row.businessAccountID,
				contactId: row.contactID,
				activityNoteId: row.activityNoteID,
				meetingDate: row.meetingDate,
				meetingTitle: row.meetingTitle,
				meetingSummary: row.meetingSummary,
				transcriptHtml: row.transcriptHtml,
				transcriptUrl: row.transcriptUrl,
				matchDiagnostics: row.matchDiagnostics,
				approvedDateTime: row.approvedDateTime,
			},
		},
	},
];
`;

const workflow = [
	{
		updatedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		id: workflowId,
		name: "Opportunity Summary Sync",
		description: "Fetches approved Acumatica meeting-note approvals that are pending downstream sync, posts a structured opportunity-summary update payload to an external summary service, and marks the approval row as synced.",
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
				name: "Get Approved Records",
				type: "n8n-nodes-base.httpRequest",
				typeVersion: 4.4,
				position: [520, 300],
				parameters: {
					method: "GET",
					url: '={{ ($env.ACU_BASE_URL || "https://localhost:443") + "/" + ($env.ACU_INSTANCE_NAME || "demo") + "/entity/" + ($env.ACU_APPROVAL_ENDPOINT_NAME || "LSOpportunityNotes") + "/" + ($env.ACU_APPROVAL_ENDPOINT_VERSION || "25.200.001") + "/OpportunityNotesApproval" }}',
					authentication: "genericCredentialType",
					genericAuthType: "oAuth2Api",
					sendQuery: true,
					queryParameters: {
						parameters: [
							{
								name: "$filter",
								value: "Status eq 'A' and PostApprovalSyncStatus eq 'P'",
							},
						],
					},
					options: {
						allowUnauthorizedCerts: true,
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
				id: "3",
				name: "Normalize Approved Records",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [780, 300],
				parameters: {
					mode: "runOnceForAllItems",
					language: "javaScript",
					jsCode: normalizeApprovedRecordsCode,
				},
			},
			{
				id: "4",
				name: "Build Summary Request",
				type: "n8n-nodes-base.code",
				typeVersion: 2,
				position: [1040, 300],
				parameters: {
					mode: "runOnceForEachItem",
					language: "javaScript",
					jsCode: buildSummaryRequestCode,
				},
			},
			{
				id: "5",
				name: "Push Opportunity Summary Update",
				type: "n8n-nodes-base.httpRequest",
				typeVersion: 4.4,
				position: [1300, 300],
				parameters: {
					method: "POST",
					// Deferred: replace OPPORTUNITY_SUMMARY_UPSERT_URL with the final approved
					// summary destination and trigger model once the downstream RAG writer is defined.
					url: '={{ $env.OPPORTUNITY_SUMMARY_UPSERT_URL }}',
					authentication: "none",
					sendBody: true,
					contentType: "json",
					specifyBody: "json",
					jsonBody: '={{ $json.summaryUpsertPayload }}',
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
				id: "6",
				name: "Update Sync Success",
				type: "n8n-nodes-base.httpRequest",
				typeVersion: 4.4,
				position: [1560, 300],
				parameters: {
					method: "PUT",
					url: '={{ ($env.ACU_BASE_URL || "https://localhost:443") + "/" + ($env.ACU_INSTANCE_NAME || "demo") + "/entity/" + ($env.ACU_APPROVAL_ENDPOINT_NAME || "LSOpportunityNotes") + "/" + ($env.ACU_APPROVAL_ENDPOINT_VERSION || "25.200.001") + "/OpportunityNotesApproval" }}',
					authentication: "genericCredentialType",
					genericAuthType: "oAuth2Api",
					sendBody: true,
					contentType: "json",
					specifyBody: "json",
					jsonBody: '={{ $json.acumaticaSyncPayload }}',
					options: {
						allowUnauthorizedCerts: true,
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
							node: "Get Approved Records",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Get Approved Records": {
				main: [
					[
						{
							node: "Normalize Approved Records",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Normalize Approved Records": {
				main: [
					[
						{
							node: "Build Summary Request",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Build Summary Request": {
				main: [
					[
						{
							node: "Push Opportunity Summary Update",
							type: "main",
							index: 0,
						},
					],
				],
			},
			"Push Opportunity Summary Update": {
				main: [
					[
						{
							node: "Update Sync Success",
							type: "main",
							index: 0,
						},
					],
				],
			},
		},
		settings: {},
		versionId: "1",
		meta: {},
		pinData: {},
		tags: [],
	},
];

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(workflow, null, 2) + "\n", "utf8");
