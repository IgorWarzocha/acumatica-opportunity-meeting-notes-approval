using System;
using System.Collections;
using System.IO;
using System.Net;
using System.Text;
using PX.Common;
using PX.Data;
using PX.Objects.CR;

namespace LSOpportunityMeetingNotesApproval
{
	public class LSOpportunityChatMaint : PXGraph<LSOpportunityChatMaint, LSOpportunityChatSession>
	{
		#region Views
		public PXSelect<LSOpportunityChatSession> Document;

		public PXSelect<LSOpportunityChatMessage,
			Where<LSOpportunityChatMessage.chatSessionID, Equal<Current<LSOpportunityChatSession.chatSessionID>>>,
			OrderBy<Asc<LSOpportunityChatMessage.messageDateTime, Asc<LSOpportunityChatMessage.chatMessageID>>>> Messages;

		public PXFilter<LSOpportunityChatPrompt> Prompt;
		public PXFilter<LSOpportunityChatContext> Context;
		public PXSetup<LSOpportunityChatSetup> Setup;

		public new PXSave<LSOpportunityChatSession> Save;
		public new PXCancel<LSOpportunityChatSession> Cancel;
		#endregion

		#region View Delegates
		protected virtual IEnumerable document()
		{
			string opportunityID = Document.Current?.OpportunityID ?? Context.Current?.OpportunityID ?? Prompt.Current?.OpportunityID;
			if (!string.IsNullOrWhiteSpace(opportunityID))
			{
				LSOpportunityChatSession session = FindSession(this, opportunityID);
				if (session != null)
				{
					yield return session;
					yield break;
				}

				CROpportunity opportunity = FindOpportunity(this, opportunityID);
				if (opportunity == null)
				{
					throw new PXException(LSOpportunityMeetingNotesApprovalMessages.OpportunityNotFound, opportunityID);
				}

				yield return new LSOpportunityChatSession
				{
					OpportunityID = opportunity.OpportunityID,
					Subject = opportunity.Subject,
				};
				yield break;
			}

			foreach (LSOpportunityChatSession session in PXSelect<LSOpportunityChatSession>.Select(this))
			{
				yield return session;
			}
		}
		#endregion

		#region Actions
		public PXAction<LSOpportunityChatSession> Send;
		[PXButton(CommitChanges = true)]
		[PXUIField(DisplayName = LSOpportunityChatMessages.Send, MapEnableRights = PXCacheRights.Update, MapViewRights = PXCacheRights.Select)]
		public virtual IEnumerable send(PXAdapter adapter)
		{
			LSOpportunityChatPrompt prompt = Prompt.Current;
			if (prompt == null || string.IsNullOrWhiteSpace(prompt.MessageText))
			{
				throw new PXException(LSOpportunityChatMessages.MessageIsRequired);
			}

			LSOpportunityChatSession session = EnsureSession(prompt.OpportunityID);
			string userMessageText = prompt.MessageText.Trim();

			InsertMessage(session.ChatSessionID, LSOpportunityChatMessageRole.User, userMessageText);
			Actions.PressSave();

			string assistantAnswer = SendToWebhook(session, userMessageText);
			if (string.IsNullOrWhiteSpace(assistantAnswer))
			{
				throw new PXException(LSOpportunityChatMessages.ChatWebhookReturnedNoAnswer);
			}

			InsertMessage(session.ChatSessionID, LSOpportunityChatMessageRole.Assistant, assistantAnswer);
			session.LastMessageDateTime = PXTimeZoneInfo.Now;
			Document.Update(session);
			prompt.MessageText = null;
			Prompt.Update(prompt);
			Actions.PressSave();

			return adapter.Get();
		}
		#endregion

		#region Events
		protected virtual void _(Events.RowSelected<LSOpportunityChatSession> e)
		{
			if (e.Row == null)
			{
				return;
			}

			CROpportunity opportunity = FindOpportunity(this, e.Row.OpportunityID);
			Context.Current = BuildContext(opportunity);
			if (Prompt.Current != null)
			{
				Prompt.Current.OpportunityID = e.Row.OpportunityID;
			}
		}
		#endregion

		#region Helpers
		public static void OpenForOpportunity(string opportunityID)
		{
			if (string.IsNullOrWhiteSpace(opportunityID))
			{
				throw new PXException(LSOpportunityChatMessages.OpportunityIsRequired);
			}

			LSOpportunityChatMaint graph = PXGraph.CreateInstance<LSOpportunityChatMaint>();
			LSOpportunityChatSession session = graph.EnsureSession(opportunityID);
			graph.Document.Current = session;
			throw new PXRedirectRequiredException(graph, LSOpportunityChatMessages.OpportunityChat) { Mode = PXBaseRedirectException.WindowMode.InlineWindow };
		}

		protected virtual LSOpportunityChatSession EnsureSession(string opportunityID)
		{
			if (string.IsNullOrWhiteSpace(opportunityID))
			{
				throw new PXException(LSOpportunityChatMessages.OpportunityIsRequired);
			}

			LSOpportunityChatSession session = FindSession(this, opportunityID);

			if (session != null)
			{
				Document.Current = session;
				return session;
			}

			CROpportunity opportunity = FindOpportunity(this, opportunityID);
			if (opportunity == null)
			{
				throw new PXException(LSOpportunityMeetingNotesApprovalMessages.OpportunityNotFound, opportunityID);
			}

			session = Document.Insert(new LSOpportunityChatSession
			{
				OpportunityID = opportunity.OpportunityID,
				Subject = opportunity.Subject,
				LastMessageDateTime = PXTimeZoneInfo.Now,
			});
			Actions.PressSave();
			Document.Current = session;
			return session;
		}

		protected virtual void InsertMessage(int? chatSessionID, string role, string messageText)
		{
			Messages.Insert(new LSOpportunityChatMessage
			{
				ChatSessionID = chatSessionID,
				Role = role,
				MessageText = messageText,
				MessageDateTime = PXTimeZoneInfo.Now,
			});
		}

		protected static LSOpportunityChatSession FindSession(PXGraph graph, string opportunityID)
		{
			return PXSelect<LSOpportunityChatSession,
				Where<LSOpportunityChatSession.opportunityID, Equal<Required<LSOpportunityChatSession.opportunityID>>>>
				.SelectWindowed(graph, 0, 1, opportunityID)
				.TopFirst;
		}

		protected virtual string SendToWebhook(LSOpportunityChatSession session, string userMessageText)
		{
			LSOpportunityChatSetup setup = Setup.Current ?? PXSelect<LSOpportunityChatSetup>.Select(this);
			if (setup == null || string.IsNullOrWhiteSpace(setup.N8nWebhookUrl))
			{
				throw new PXException(LSOpportunityChatMessages.ChatWebhookIsNotConfigured);
			}

			if (string.IsNullOrWhiteSpace(setup.N8nClientSecret))
			{
				throw new PXException(LSOpportunityChatMessages.ChatClientSecretIsNotConfigured);
			}

			CROpportunity opportunity = FindOpportunity(this, session.OpportunityID);
			LSOpportunityChatContext context = BuildContext(opportunity);
			string payload = BuildWebhookPayload(session, userMessageText, context, setup.N8nClientSecret);
			byte[] payloadBytes = Encoding.UTF8.GetBytes(payload);

			HttpWebRequest request = (HttpWebRequest)WebRequest.Create(setup.N8nWebhookUrl);
			request.Method = "POST";
			request.ContentType = "application/json";
			request.Accept = "application/json";
			request.ContentLength = payloadBytes.Length;

			using (Stream requestStream = request.GetRequestStream())
			{
				requestStream.Write(payloadBytes, 0, payloadBytes.Length);
			}

			using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
			using (Stream responseStream = response.GetResponseStream())
			using (StreamReader reader = new StreamReader(responseStream ?? Stream.Null, Encoding.UTF8))
			{
				return ExtractAnswer(reader.ReadToEnd());
			}
		}

		public static CROpportunity FindOpportunity(PXGraph graph, string opportunityID)
		{
			if (graph == null || string.IsNullOrWhiteSpace(opportunityID))
			{
				return null;
			}

			return PXSelectReadonly<CROpportunity,
				Where<CROpportunity.opportunityID, Equal<Required<CROpportunity.opportunityID>>>>
				.SelectWindowed(graph, 0, 1, opportunityID)
				.TopFirst;
		}

		public static LSOpportunityChatContext BuildContext(CROpportunity opportunity)
		{
			if (opportunity == null)
			{
				return new LSOpportunityChatContext();
			}

			return new LSOpportunityChatContext
			{
				OpportunityID = opportunity.OpportunityID,
				Subject = opportunity.Subject,
				Status = opportunity.Status,
				StageID = opportunity.StageID,
				ClassID = opportunity.ClassID,
				OpportunityAddressID = opportunity.OpportunityAddressID,
				OpportunityContactID = opportunity.OpportunityContactID,
				ShipAddressID = opportunity.ShipAddressID,
				ShipContactID = opportunity.ShipContactID,
				BillAddressID = opportunity.BillAddressID,
				BillContactID = opportunity.BillContactID,
				ContactID = opportunity.ContactID,
				BAccountID = opportunity.BAccountID,
				ParentBAccountID = opportunity.ParentBAccountID,
				LocationID = opportunity.LocationID,
				TaxZoneID = opportunity.TaxZoneID,
				CuryID = opportunity.CuryID,
				CuryInfoID = opportunity.CuryInfoID,
				OwnerID = opportunity.OwnerID,
				WorkgroupID = opportunity.WorkgroupID,
				SalesTerritoryID = opportunity.SalesTerritoryID,
			};
		}

		protected static string BuildWebhookPayload(LSOpportunityChatSession session, string userMessageText, LSOpportunityChatContext context, string clientSecret)
		{
			StringBuilder sb = new StringBuilder();
			sb.Append('{');
			AppendJson(sb, "clientSecret", clientSecret).Append(',');
			AppendJson(sb, "chatSessionID", session.ChatSessionID).Append(',');
			AppendJson(sb, "message", userMessageText).Append(',');
			sb.Append("\"opportunity\":{");
			AppendJson(sb, "opportunityID", context.OpportunityID).Append(',');
			AppendJson(sb, "subject", context.Subject).Append(',');
			AppendJson(sb, "status", context.Status).Append(',');
			AppendJson(sb, "stageID", context.StageID).Append(',');
			AppendJson(sb, "classID", context.ClassID).Append(',');
			AppendJson(sb, "opportunityAddressID", context.OpportunityAddressID).Append(',');
			AppendJson(sb, "opportunityContactID", context.OpportunityContactID).Append(',');
			AppendJson(sb, "shipAddressID", context.ShipAddressID).Append(',');
			AppendJson(sb, "shipContactID", context.ShipContactID).Append(',');
			AppendJson(sb, "billAddressID", context.BillAddressID).Append(',');
			AppendJson(sb, "billContactID", context.BillContactID).Append(',');
			AppendJson(sb, "contactID", context.ContactID).Append(',');
			AppendJson(sb, "bAccountID", context.BAccountID).Append(',');
			AppendJson(sb, "parentBAccountID", context.ParentBAccountID).Append(',');
			AppendJson(sb, "locationID", context.LocationID).Append(',');
			AppendJson(sb, "taxZoneID", context.TaxZoneID).Append(',');
			AppendJson(sb, "curyID", context.CuryID).Append(',');
			AppendJson(sb, "curyInfoID", context.CuryInfoID).Append(',');
			AppendJson(sb, "ownerID", context.OwnerID).Append(',');
			AppendJson(sb, "workgroupID", context.WorkgroupID).Append(',');
			AppendJson(sb, "salesTerritoryID", context.SalesTerritoryID);
			sb.Append("}} ");
			return sb.ToString().TrimEnd();
		}

		protected static StringBuilder AppendJson(StringBuilder sb, string name, object value)
		{
			sb.Append('"').Append(EscapeJson(name)).Append("\":");
			if (value == null)
			{
				sb.Append("null");
			}
			else if (value is int || value is long || value is decimal)
			{
				sb.Append(value);
			}
			else
			{
				sb.Append('"').Append(EscapeJson(Convert.ToString(value))).Append('"');
			}
			return sb;
		}

		protected static string EscapeJson(string value)
		{
			return (value ?? string.Empty)
				.Replace("\\", "\\\\")
				.Replace("\"", "\\\"")
				.Replace("\r", "\\r")
				.Replace("\n", "\\n")
				.Replace("\t", "\\t");
		}

		protected static string ExtractAnswer(string response)
		{
			if (string.IsNullOrWhiteSpace(response))
			{
				return null;
			}

			const string answerProperty = "\"answer\"";
			int propertyIndex = response.IndexOf(answerProperty, StringComparison.OrdinalIgnoreCase);
			if (propertyIndex < 0)
			{
				return response;
			}

			int colonIndex = response.IndexOf(':', propertyIndex + answerProperty.Length);
			int quoteStart = colonIndex < 0 ? -1 : response.IndexOf('"', colonIndex + 1);
			if (quoteStart < 0)
			{
				return response;
			}

			StringBuilder answer = new StringBuilder();
			bool escaping = false;
			for (int i = quoteStart + 1; i < response.Length; i++)
			{
				char c = response[i];
				if (escaping)
				{
					answer.Append(c == 'n' ? '\n' : c == 'r' ? '\r' : c == 't' ? '\t' : c);
					escaping = false;
					continue;
				}

				if (c == '\\')
				{
					escaping = true;
					continue;
				}

				if (c == '"')
				{
					break;
				}

				answer.Append(c);
			}

			return answer.ToString();
		}
		#endregion
	}
}
