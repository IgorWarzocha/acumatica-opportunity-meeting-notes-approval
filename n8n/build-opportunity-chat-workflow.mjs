import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const workflow = {
	name: "LS Opportunity Chat Claude Backend",
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
			parameters: {
				jsCode: `const body = $json.body ?? $json;\nif (!process.env.LS_N8N_CLIENT_SECRET) { throw new Error('LS_N8N_CLIENT_SECRET is not configured'); }\nif (body.clientSecret !== process.env.LS_N8N_CLIENT_SECRET) { throw new Error('Invalid client secret'); }\nreturn [{ json: { ...body, acumaticaBaseUrl: process.env.ACUMATICA_BASE_URL, endpointBase: (process.env.ACUMATICA_BASE_URL || '').replace(/\\/$/, '') + '/entity/LSOpportunityNotes/25.200.001' } }];`,
			},
			id: randomUUID(),
			name: "Validate Secret and Normalize Request",
			type: "n8n-nodes-base.code",
			typeVersion: 2,
			position: [260, 0],
		},
		{
			parameters: {
				method: "GET",
				url: "={{$json.endpointBase + '/OpportunityChatContext/' + encodeURIComponent($json.opportunity.opportunityID)}}",
				authentication: "predefinedCredentialType",
				nodeCredentialType: "oAuth2Api",
				options: {},
			},
			id: randomUUID(),
			name: "GET Opportunity Context",
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [520, -120],
		},
		{
			parameters: {
				method: "GET",
				url: "={{$node['Validate Secret and Normalize Request'].json.endpointBase + '/OpportunityNotesApproval?$filter=ConfirmedOpportunityID eq ' + \"'\" + $node['Validate Secret and Normalize Request'].json.opportunity.opportunityID + \"'\"}}",
				authentication: "predefinedCredentialType",
				nodeCredentialType: "oAuth2Api",
				options: {},
			},
			id: randomUUID(),
			name: "GET Related Meeting Notes and Transcripts",
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [520, 120],
		},
		{
			parameters: {
				jsCode: `const request = $node['Validate Secret and Normalize Request'].json;\nconst opportunity = $node['GET Opportunity Context'].json;\nconst meetingNotes = $node['GET Related Meeting Notes and Transcripts'].json;\nreturn [{ json: { request, opportunity, meetingNotes } }];`,
			},
			id: randomUUID(),
			name: "Build Claude Prompt",
			type: "n8n-nodes-base.code",
			typeVersion: 2,
			position: [800, 0],
		},
		{
			parameters: {
				method: "POST",
				url: "https://api.anthropic.com/v1/messages",
				sendHeaders: true,
				headerParameters: {
					parameters: [
						{ name: "x-api-key", value: "={{$env.ANTHROPIC_API_KEY}}" },
						{ name: "anthropic-version", value: "2023-06-01" },
						{ name: "content-type", value: "application/json" },
					],
				},
				sendBody: true,
				specifyBody: "json",
				jsonBody: "={{JSON.stringify({ model: $env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest', max_tokens: 1200, system: 'You are an Acumatica opportunity analysis assistant. You are read-only. You may analyze Opportunity data and related meeting-note transcripts. Do not suggest that you changed Acumatica data.', messages: [{ role: 'user', content: 'User question: ' + $json.request.message + '\\n\\nOpportunity context JSON:\\n' + JSON.stringify($json.opportunity, null, 2) + '\\n\\nRelated meeting notes/transcripts JSON:\\n' + JSON.stringify($json.meetingNotes, null, 2) }] })}}",
				options: {},
			},
			id: randomUUID(),
			name: "Claude Analyze Opportunity",
			type: "n8n-nodes-base.httpRequest",
			typeVersion: 4.2,
			position: [1060, 0],
		},
		{
			parameters: {
				jsCode: `const content = $json.content || [];\nconst answer = Array.isArray(content) ? content.map(part => part.text || '').join('\\n').trim() : JSON.stringify($json);\nreturn [{ json: { answer } }];`,
			},
			id: randomUUID(),
			name: "Return Answer",
			type: "n8n-nodes-base.code",
			typeVersion: 2,
			position: [1320, 0],
		},
	],
	connections: {
		"Opportunity Chat Webhook": { main: [[{ node: "Validate Secret and Normalize Request", type: "main", index: 0 }]] },
		"Validate Secret and Normalize Request": { main: [[{ node: "GET Opportunity Context", type: "main", index: 0 }, { node: "GET Related Meeting Notes and Transcripts", type: "main", index: 0 }]] },
		"GET Opportunity Context": { main: [[{ node: "Build Claude Prompt", type: "main", index: 0 }]] },
		"GET Related Meeting Notes and Transcripts": { main: [[{ node: "Build Claude Prompt", type: "main", index: 0 }]] },
		"Build Claude Prompt": { main: [[{ node: "Claude Analyze Opportunity", type: "main", index: 0 }]] },
		"Claude Analyze Opportunity": { main: [[{ node: "Return Answer", type: "main", index: 0 }]] },
	},
	settings: { executionOrder: "v1" },
};

writeFileSync(new URL("./opportunity-chat-claude.workflow.json", import.meta.url), JSON.stringify(workflow, null, "\t"));
