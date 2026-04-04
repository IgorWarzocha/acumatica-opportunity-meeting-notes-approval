using PX.Data;
using PX.Objects.CR;
using System.Collections.Generic;
using System.Linq;

namespace PX.Objects.LS
{
	public class LSOpportunityMeetingNotesApprovalEntry : PXGraph<LSOpportunityMeetingNotesApprovalEntry, LSOpportunityMeetingNotesApproval>
	{
		[PXCopyPasteHiddenFields(typeof(LSOpportunityMeetingNotesApproval.transcriptHtml), typeof(LSOpportunityMeetingNotesApproval.matchDiagnostics))]
		public PXSelect<LSOpportunityMeetingNotesApproval> Document;

		public new PXSave<LSOpportunityMeetingNotesApproval> Save;
		public new PXCancel<LSOpportunityMeetingNotesApproval> Cancel;

		public PXAction<LSOpportunityMeetingNotesApproval> Approve;
		[PXButton(CommitChanges = true)]
		[PXUIField(DisplayName = "Approve", MapEnableRights = PXCacheRights.Update, MapViewRights = PXCacheRights.Select)]
		public virtual System.Collections.IEnumerable approve(PXAdapter adapter)
		{
			foreach (LSOpportunityMeetingNotesApproval row in ResolveRows(adapter))
			{
				LSOpportunityMeetingNotesApprovalApprovalService.Approve(this, row.ApprovalID);
			}

			return adapter.Get();
		}

		public PXAction<LSOpportunityMeetingNotesApproval> Reject;
		[PXButton(CommitChanges = true)]
		[PXUIField(DisplayName = "Reject", MapEnableRights = PXCacheRights.Update, MapViewRights = PXCacheRights.Select)]
		public virtual System.Collections.IEnumerable reject(PXAdapter adapter)
		{
			foreach (LSOpportunityMeetingNotesApproval row in ResolveRows(adapter))
			{
				LSOpportunityMeetingNotesApprovalApprovalService.Reject(this, row.ApprovalID);
			}

			return adapter.Get();
		}

		public PXAction<LSOpportunityMeetingNotesApproval> ViewSuggestedOpportunity;
		[PXButton]
		[PXUIField(DisplayName = "View Suggested Opportunity", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		public virtual System.Collections.IEnumerable viewSuggestedOpportunity(PXAdapter adapter)
		{
			return RedirectToOpportunity(adapter, Document.Current?.SuggestedOpportunityID);
		}

		public PXAction<LSOpportunityMeetingNotesApproval> ViewConfirmedOpportunity;
		[PXButton]
		[PXUIField(DisplayName = "View Confirmed Opportunity", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		public virtual System.Collections.IEnumerable viewConfirmedOpportunity(PXAdapter adapter)
		{
			return RedirectToOpportunity(adapter, Document.Current?.ConfirmedOpportunityID);
		}

		private IEnumerable<LSOpportunityMeetingNotesApproval> ResolveRows(PXAdapter adapter)
		{
			var rows = adapter.Get<LSOpportunityMeetingNotesApproval>().Where(row => row != null).ToList();
			if (rows.Count == 0 && Document.Current != null)
			{
				rows.Add(Document.Current);
			}

			return rows.Where(row => row?.ApprovalID != null);
		}

		protected virtual void _(Events.RowInserted<LSOpportunityMeetingNotesApproval> e)
		{
			if (e.Row == null)
			{
				return;
			}

			if (string.IsNullOrWhiteSpace(e.Row.Subject))
			{
				e.Row.Subject = e.Row.MeetingTitle;
			}
		}

		protected virtual void _(Events.RowSelected<LSOpportunityMeetingNotesApproval> e)
		{
			if (e.Row == null)
			{
				return;
			}

			var isApproved = e.Row.Status == LSOpportunityMeetingNotesApprovalStatus.Approved;
			PXUIFieldAttribute.SetEnabled<LSOpportunityMeetingNotesApproval.confirmedOpportunityID>(e.Cache, e.Row, !isApproved);
			PXUIFieldAttribute.SetEnabled<LSOpportunityMeetingNotesApproval.suggestedOpportunityID>(e.Cache, e.Row, !isApproved);
		}

		protected virtual void _(Events.RowPersisting<LSOpportunityMeetingNotesApproval> e)
		{
			if (e.Row == null || e.Operation.Command() == PXDBOperation.Delete)
			{
				return;
			}

			if (string.IsNullOrWhiteSpace(e.Row.Subject) && !string.IsNullOrWhiteSpace(e.Row.MeetingTitle))
			{
				e.Row.Subject = e.Row.MeetingTitle;
			}

			if (!string.IsNullOrWhiteSpace(e.Row.ExternalMeetingID))
			{
				var duplicate = PXSelectReadonly<
						LSOpportunityMeetingNotesApproval,
						Where<
							LSOpportunityMeetingNotesApproval.externalMeetingID, Equal<Required<LSOpportunityMeetingNotesApproval.externalMeetingID>>,
							And<LSOpportunityMeetingNotesApproval.approvalID, NotEqual<Required<LSOpportunityMeetingNotesApproval.approvalID>>>>>
					.SelectWindowed(this, 0, 1, e.Row.ExternalMeetingID, e.Row.ApprovalID ?? -1)
					.TopFirst;

				if (duplicate != null)
				{
					throw new PXSetPropertyException<LSOpportunityMeetingNotesApproval.externalMeetingID>("External Meeting ID must be unique.");
				}
			}
		}

		private System.Collections.IEnumerable RedirectToOpportunity(PXAdapter adapter, string opportunityID)
		{
			if (string.IsNullOrWhiteSpace(opportunityID))
			{
				return adapter.Get();
			}

			var graph = PXGraph.CreateInstance<OpportunityMaint>();
			var opportunity = CROpportunity.PK.Find(graph, opportunityID);
				if (opportunity == null)
				{
					throw new PXException(string.Format("Opportunity '{0}' was not found.", opportunityID));
				}

			graph.Opportunity.Current = opportunity;

			throw new PXRedirectRequiredException(graph, true, string.Empty)
			{
				Mode = PXBaseRedirectException.WindowMode.NewWindow,
			};
		}
	}
}
