import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const validateRequestCode = `const body = $json.body ?? $json;
const configuredSecret = process.env.LS_N8N_CLIENT_SECRET || (typeof $vars !== 'undefined' ? $vars.LS_N8N_CLIENT_SECRET : undefined);
if (!configuredSecret) {
	throw new Error('LS_N8N_CLIENT_SECRET is not configured');
}
if (!body.clientSecret || body.clientSecret !== configuredSecret) {
	throw new Error('Invalid client secret');
}

const opportunityID = body.opportunity?.opportunityID ?? body.opportunityID;
if (!opportunityID) {
	throw new Error('opportunity.opportunityID is required');
}
if (!body.message || !String(body.message).trim()) {
	throw new Error('message is required');
}

const configuredBaseUrl = process.env.ACUMATICA_BASE_URL || (typeof $vars !== 'undefined' ? $vars.ACUMATICA_BASE_URL : undefined);
const acumaticaBaseUrl = (configuredBaseUrl || '').replace(/\/$/, '');
if (!acumaticaBaseUrl) {
	throw new Error('ACUMATICA_BASE_URL is not configured');
}

const endpointBase = acumaticaBaseUrl + '/entity/LSOpportunityNotes/25.200.001';
const escapedOpportunityID = String(opportunityID).replace(/'/g, "''");
const notesFilter = "ConfirmedOpportunityID eq '" + escapedOpportunityID + "'";

return [{
	json: {
		chatSessionID: body.chatSessionID,
		message: String(body.message).trim(),
		opportunity: body.opportunity ?? { opportunityID },
		opportunityID,
		endpointBase,
		contextUrl: endpointBase + '/OpportunityChatContext/' + encodeURIComponent(opportunityID),
		notesUrl: endpointBase + '/OpportunityNotesApproval?$filter=' + encodeURIComponent(notesFilter),
	},
}];`;

const buildClaudePromptCode = `const request = $node['Validate Secret and Normalize Request'].json;
const opportunity = $node['GET Opportunity Context'].json;
const meetingNotesResponse = $node['GET Related Meeting Notes and Transcripts'].json;
const meetingNotes = Array.isArray(meetingNotesResponse?.value) ? meetingNotesResponse.value : meetingNotesResponse;

return [{
	json: {
		request,
		opportunity,
		meetingNotes,
		anthropicBody: {
			model: process.env.ANTHROPIC_MODEL || (typeof $vars !== 'undefined' ? $vars.ANTHROPIC_MODEL : undefined) || 'claude-3-5-sonnet-latest',
			max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS || (typeof $vars !== 'undefined' ? $vars.ANTHROPIC_MAX_TOKENS : undefined) || 1200),
			system: [
				'You are an Acumatica opportunity analysis assistant.',
				'You are strictly read-only.',
				'You may analyze Opportunity data and related meeting-note transcripts.',
				'Do not claim that you changed Acumatica data.',
				'If data is missing, say exactly what is missing.'
			].join(' '),
			messages: [{
				role: 'user',
				content: [
					'User question:',
					request.message,
					'',
					'Opportunity context JSON:',
					JSON.stringify(opportunity, null, 2),
					'',
					'Related meeting notes/transcripts JSON:',
					JSON.stringify(meetingNotes, null, 2)
				].join('\n')
			}]
		}
	}
}];`;

const returnAnswerCode = `const content = $json.content || [];
const answer = Array.isArray(content)
	? content.map(part => part?.text || '').filter(Boolean).join('\n').trim()
	: '';

return [{
	json: {
		answer: answer || JSON.stringify($json),
		model: $json.model,
		usage: $json.usage,
	}
}];`;

const workflow = {
	id: "26816b4b-966b-4e69-8b2f-5964f92e71d2",
	name: "LS Opportunity Chat Claude Backend",
	active: false,
	isArchived: false,
	nodes: [
		{
			parameters: {
				httpMethod: "POST",
				path: "ls-opportunity-chat",
				responseMode: "lastNode",
				options: {},
			},
			id: randomUUID(),
			name: "Opportunity Chat Webhook",
			type: "n8n-nodes-base.webhook",
			typeVersion: 2,
			position: [0, 0],
		},
		{
			parameters: { jsCode: validateRequestCode },
			id: randomUUID(),
			name: "Validate Secret and Normalize Request",
			type: "n8n-nodes-base.code",
			typeVersion: 2,
			position: [260, 0],
		},
		{
			parameters: {
				method: "GET",
				url: "={{$json.contextUrl}}",
				authentication: "predefinedCredentialType",
				nodeCredentialType: "oAuth2Api",
				options: {},
			},
			id: randomUUID(),
			name: "GET Opportunity Context",
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [520, 0],
		},
		{
			parameters: {
				method: "GET",
				url: "={{$node['Validate Secret and Normalize Request'].json.notesUrl}}",
				authentication: "predefinedCredentialType",
				nodeCredentialType: "oAuth2Api",
				options: {},
			},
			id: randomUUID(),
			name: "GET Related Meeting Notes and Transcripts",
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [780, 0],
		},
		{
			parameters: { jsCode: buildClaudePromptCode },
			id: randomUUID(),
			name: "Build Claude Prompt",
			type: "n8n-nodes-base.code",
			typeVersion: 2,
			position: [1040, 0],
		},
		{
			parameters: {
				method: "POST",
				url: "https://api.anthropic.com/v1/messages",
				sendHeaders: true,
				headerParameters: {
					parameters: [
						{ name: "x-api-key", value: "={{$env.ANTHROPIC_API_KEY || $vars.ANTHROPIC_API_KEY}}" },
						{ name: "anthropic-version", value: "2023-06-01" },
						{ name: "content-type", value: "application/json" },
					],
				},
				sendBody: true,
				specifyBody: "json",
				jsonBody: "={{JSON.stringify($json.anthropicBody)}}",
				options: {},
			},
			id: randomUUID(),
			name: "Claude Analyze Opportunity",
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [1300, 0],
		},
		{
			parameters: { jsCode: returnAnswerCode },
			id: randomUUID(),
			name: "Return Answer",
			type: "n8n-nodes-base.code",
			typeVersion: 2,
			position: [1560, 0],
		},
	],
	connections: {
		"Opportunity Chat Webhook": { main: [[{ node: "Validate Secret and Normalize Request", type: "main", index: 0 }]] },
		"Validate Secret and Normalize Request": { main: [[{ node: "GET Opportunity Context", type: "main", index: 0 }]] },
		"GET Opportunity Context": { main: [[{ node: "GET Related Meeting Notes and Transcripts", type: "main", index: 0 }]] },
		"GET Related Meeting Notes and Transcripts": { main: [[{ node: "Build Claude Prompt", type: "main", index: 0 }]] },
		"Build Claude Prompt": { main: [[{ node: "Claude Analyze Opportunity", type: "main", index: 0 }]] },
		"Claude Analyze Opportunity": { main: [[{ node: "Return Answer", type: "main", index: 0 }]] },
	},
	settings: { executionOrder: "v1" },
};

writeFileSync(new URL("./opportunity-chat-claude.workflow.json", import.meta.url), JSON.stringify([workflow], null, "\t"));
