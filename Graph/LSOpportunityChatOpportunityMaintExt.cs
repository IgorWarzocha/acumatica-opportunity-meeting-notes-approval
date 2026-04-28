using System.Collections;
using PX.Data;
using PX.Objects.CR;
using LS.OpportunityMeetingNotesApproval.DAC;
using LS.OpportunityMeetingNotesApproval.Helper;

namespace LS.OpportunityMeetingNotesApproval.Graph
{
	public class LSOpportunityChatOpportunityMaintExt : PXGraphExtension<OpportunityMaint>
	{
		public static bool IsActive() => true;
		#region Views
		public PXFilter<LSOpportunityChatContext> LSOpportunityChatContext;
		#endregion

		#region Actions
		public PXAction<CROpportunity> OpenOpportunityChat;
		[PXButton(CommitChanges = true)]
		[PXUIField(DisplayName = LSOpportunityChatMessages.OpenOpportunityChat, MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		public virtual IEnumerable openOpportunityChat(PXAdapter adapter)
		{
			CROpportunity opportunity = Base.Opportunity.Current;
			if (opportunity == null || string.IsNullOrWhiteSpace(opportunity.OpportunityID))
			{
				throw new PXException(LSOpportunityChatMessages.OpportunityIsRequired);
			}

			LSOpportunityChatMaint.OpenForOpportunity(opportunity.OpportunityID);
			return adapter.Get();
		}
		#endregion

		#region Events
		protected virtual void _(Events.RowSelected<CROpportunity> e)
		{
			LSOpportunityChatContext.Current = LSOpportunityChatMaint.BuildContext(e.Row);
		}
		#endregion
	}
}
