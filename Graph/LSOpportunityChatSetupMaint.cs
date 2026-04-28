using PX.Data;
using LS.OpportunityMeetingNotesApproval.DAC;
using LS.OpportunityMeetingNotesApproval.Helper;

namespace LS.OpportunityMeetingNotesApproval.Graph
{
	public class LSOpportunityChatSetupMaint : PXGraph<LSOpportunityChatSetupMaint, LSOpportunityChatSetup>
	{
		#region Views
		public PXSelect<LSOpportunityChatSetup> Setup;
		#endregion
	}
}
