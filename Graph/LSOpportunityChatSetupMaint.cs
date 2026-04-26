using PX.Data;

namespace LSOpportunityMeetingNotesApproval
{
	public class LSOpportunityChatSetupMaint : PXGraph<LSOpportunityChatSetupMaint, LSOpportunityChatSetup>
	{
		#region Views
		public PXSelect<LSOpportunityChatSetup> Setup;
		public new PXSave<LSOpportunityChatSetup> Save;
		public new PXCancel<LSOpportunityChatSetup> Cancel;
		#endregion
	}
}
