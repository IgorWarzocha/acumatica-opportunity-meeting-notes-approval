using PX.Data;
using LSOpportunityMeetingNotesApproval.DAC;
using LSOpportunityMeetingNotesApproval.Helper;

namespace LSOpportunityMeetingNotesApproval.Graph
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
