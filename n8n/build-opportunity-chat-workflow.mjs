import { writeFileSync } from "node:fs";

const workflow = [
	{
		"id": "26816b4b-966b-4e69-8b2f-5964f92e71d2",
		"name": "LS Opportunity Chat Claude Backend",
		"active": false,
		"isArchived": false,
		"nodes": [
			{
				"parameters": {
					"httpMethod": "POST",
					"path": "ls-opportunity-chat",
					"responseMode": "responseNode",
					"options": {}
				},
				"id": "a828d3c3-ed2f-48f7-841d-def7d2dc8b54",
				"name": "Opportunity Chat Webhook",
				"type": "n8n-nodes-base.webhook",
				"typeVersion": 2,
				"position": [
					0,
					0
				],
				"webhookId": "ls-opportunity-chat"
			},
			{
				"parameters": {
					"jsCode": "const body = $json.body ?? $json;\nconst secret = $vars.LS_N8N_CLIENT_SECRET;\nif (!secret) throw new Error('LS_N8N_CLIENT_SECRET is not configured');\nif (body.clientSecret !== secret) throw new Error('Invalid client secret');\nconst opportunityID = body.opportunity?.opportunityID ?? body.opportunityID;\nconst message = String(body.message ?? '').trim();\nif (!opportunityID) throw new Error('opportunityID is required');\nif (!message) throw new Error('message is required');\nconst baseUrl = String($vars.ACUMATICA_BASE_URL || 'http://172.17.0.3/AcumaticaERP').replace(/\\/$/, '');\nconst endpoint = baseUrl + '/entity/LSOpportunityNotes/25.200.001';\nconst filter = \"ConfirmedOpportunityID eq '\" + String(opportunityID).replace(/'/g, \"''\") + \"'\";\nreturn [{ json: {\n  chatSessionID: body.chatSessionID,\n  sessionId: String(body.chatSessionID ?? opportunityID),\n  opportunityID,\n  message,\n  chatInput: 'Question:\\n' + message + '\\n\\nRecent conversation:\\n' + JSON.stringify(Array.isArray(body.chatHistory) ? body.chatHistory : [], null, 2) + '\\n\\nOpportunity snapshot:\\n' + JSON.stringify(body.opportunity ?? { opportunityID }, null, 2) + '\\n\\nUse the tools for current Acumatica data when useful. Answer the question directly.',\n  opportunity: body.opportunity ?? { opportunityID },\n  chatHistory: Array.isArray(body.chatHistory) ? body.chatHistory : [],\n  contextUrl: endpoint + '/OpportunityChatContext/' + encodeURIComponent(opportunityID),\n  notesUrl: endpoint + '/OpportunityNotesApproval?$filter=' + encodeURIComponent(filter),\n}}];"
				},
				"id": "b82fffab-3b63-4450-b8bc-8d83d83569d4",
				"name": "Authorize Request",
				"type": "n8n-nodes-base.code",
				"typeVersion": 2,
				"position": [
					260,
					0
				]
			},
			{
				"parameters": {
					"promptType": "auto",
					"text": "={{$json.chatInput}}",
					"hasOutputParser": false,
					"needsFallback": false,
					"options": {
						"systemMessage": "You are a read-only CRM opportunity analyst. Answer from the provided conversation, opportunity snapshot, and GET-only Acumatica tools. Use tools when current opportunity fields or related meeting notes are needed. Do not create, update, delete, approve, reject, or post records. If required data is missing, say what is missing. Be concise.",
						"maxIterations": 4,
						"returnIntermediateSteps": false,
						"enableStreaming": false
					}
				},
				"id": "04477a58-4861-453b-b17c-e184b41cbbce",
				"name": "AI Agent",
				"type": "@n8n/n8n-nodes-langchain.agent",
				"typeVersion": 3.1,
				"position": [
					560,
					0
				]
			},
			{
				"parameters": {
					"model": {
						"mode": "list",
						"value": "claude-sonnet-4-5-20250929",
						"cachedResultName": "Claude Sonnet 4.5"
					},
					"options": {
						"maxTokensToSample": 1200
					}
				},
				"id": "28bca929-d5fc-4c16-9101-c37fc926b767",
				"name": "Anthropic Chat Model",
				"type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
				"typeVersion": 1.3,
				"position": [
					560,
					260
				],
				"credentials": {
					"anthropicApi": {
						"id": "l9RIE8TC7FUqezEI",
						"name": "Anthropic account"
					}
				}
			},
			{
				"parameters": {
					"toolDescription": "GET-only Acumatica tool. Returns current OpportunityChatContext for the Opportunity in this chat. Does not mutate data.",
					"method": "GET",
					"url": "={{$json.contextUrl}}",
					"authentication": "genericCredentialType",
					"genericAuthType": "oAuth2Api",
					"options": {
						"timeout": 60000,
						"response": {
							"response": {
								"responseFormat": "json"
							}
						}
					}
				},
				"id": "eab7c539-b0ed-46ee-913c-41830919f9c1",
				"name": "get_opportunity_context",
				"type": "n8n-nodes-base.httpRequestTool",
				"typeVersion": 4.4,
				"position": [
					300,
					260
				],
				"credentials": {
					"oAuth2Api": {
						"id": "f4ac1647-48e9-4a7b-876e-1a6fd7c0c146",
						"name": "Acumatica OAuth"
					}
				}
			},
			{
				"parameters": {
					"toolDescription": "GET-only Acumatica tool. Returns related OpportunityNotesApproval rows and transcript projections for the Opportunity in this chat. Does not mutate data.",
					"method": "GET",
					"url": "={{$json.notesUrl}}",
					"authentication": "genericCredentialType",
					"genericAuthType": "oAuth2Api",
					"options": {
						"timeout": 60000,
						"response": {
							"response": {
								"responseFormat": "json"
							}
						}
					}
				},
				"id": "906f76de-802b-4a5a-9fa6-80be85aae6c2",
				"name": "get_related_meeting_notes",
				"type": "n8n-nodes-base.httpRequestTool",
				"typeVersion": 4.4,
				"position": [
					820,
					260
				],
				"credentials": {
					"oAuth2Api": {
						"id": "f4ac1647-48e9-4a7b-876e-1a6fd7c0c146",
						"name": "Acumatica OAuth"
					}
				}
			},
			{
				"parameters": {
					"respondWith": "json",
					"responseBody": "={{ { \"answer\": String($json.output ?? $json.text ?? $json.response ?? $json.result ?? \"\").trim() } }}",
					"options": {
						"responseCode": 200
					}
				},
				"id": "cf593b68-a9be-47cb-ab76-b6f94581d7d8",
				"name": "Return Answer",
				"type": "n8n-nodes-base.respondToWebhook",
				"typeVersion": 1.5,
				"position": [
					900,
					0
				]
			}
		],
		"connections": {
			"Opportunity Chat Webhook": {
				"main": [
					[
						{
							"node": "Authorize Request",
							"type": "main",
							"index": 0
						}
					]
				]
			},
			"Authorize Request": {
				"main": [
					[
						{
							"node": "AI Agent",
							"type": "main",
							"index": 0
						}
					]
				]
			},
			"AI Agent": {
				"main": [
					[
						{
							"node": "Return Answer",
							"type": "main",
							"index": 0
						}
					]
				]
			},
			"Anthropic Chat Model": {
				"ai_languageModel": [
					[
						{
							"node": "AI Agent",
							"type": "ai_languageModel",
							"index": 0
						}
					]
				]
			},
			"get_opportunity_context": {
				"ai_tool": [
					[
						{
							"node": "AI Agent",
							"type": "ai_tool",
							"index": 0
						}
					]
				]
			},
			"get_related_meeting_notes": {
				"ai_tool": [
					[
						{
							"node": "AI Agent",
							"type": "ai_tool",
							"index": 0
						}
					]
				]
			}
		},
		"settings": {
			"executionOrder": "v1"
		}
	}
];

writeFileSync(new URL("./opportunity-chat-claude.workflow.json", import.meta.url), JSON.stringify(workflow, null, "\t"));
