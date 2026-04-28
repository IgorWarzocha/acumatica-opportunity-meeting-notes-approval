using PX.Common;

namespace LS.OpportunityMeetingNotesApproval.Helper
{
	[PXLocalizable]
	public static class LSOpportunityChatMessages
	{
		public const string OpportunityChat = "Opportunity Chat";
		public const string Send = "Send";
		public const string OpenOpportunityChat = "Open Opportunity Chat";
		public const string OpportunityIsRequired = "An opportunity is required before opening the chat.";
		public const string MessageIsRequired = "Enter a message before sending.";
		public const string ChatWebhookIsNotConfigured = "The n8n chat webhook is not configured.";
		public const string ChatClientSecretIsNotConfigured = "The n8n client secret is not configured.";
		public const string ChatWebhookReturnedNoAnswer = "The n8n chat webhook returned no answer.";
	}
}
