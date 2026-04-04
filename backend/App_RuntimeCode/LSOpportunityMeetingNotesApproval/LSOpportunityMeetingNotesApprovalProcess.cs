using System;
using System.Collections;
using PX.Data;
using PX.Objects.CR;
using PX.Objects.EP;

namespace PX.Objects.LS
{
	public class LSOpportunityMeetingNotesApprovalProcess : PXGraph<LSOpportunityMeetingNotesApprovalProcess>
	{
		public PXSave<LSOpportunityMeetingNotesApproval> Save;
		public PXCancel<LSOpportunityMeetingNotesApproval> Cancel;

		[PXFilterable]
		public PXProcessing<LSOpportunityMeetingNotesApproval> Records;

		public LSOpportunityMeetingNotesApprovalProcess()
		{
			Records.SetSelected<LSOpportunityMeetingNotesApproval.selected>();
			Records.SetProcessCaption("Approve");
			Records.SetProcessAllCaption("Approve All");
			Records.SetProcessDelegate<LSOpportunityMeetingNotesApprovalProcess>(Approve);
		}

		protected virtual IEnumerable records()
		{
			return PXSelect<
					LSOpportunityMeetingNotesApproval,
					Where<LSOpportunityMeetingNotesApproval.status, NotEqual<LSOpportunityMeetingNotesApprovalStatus.approved>>>
				.Select(this)
				.RowCast<LSOpportunityMeetingNotesApproval>();
		}

		public PXAction<LSOpportunityMeetingNotesApproval> ViewOpportunity;
		[PXButton]
		[PXUIField(DisplayName = "", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		[PXEditDetailButton]
		public virtual IEnumerable viewOpportunity(PXAdapter adapter)
		{
			return RedirectToOpportunity(adapter, Records.Current?.ConfirmedOpportunityID);
		}

		public PXAction<LSOpportunityMeetingNotesApproval> ViewSuggestedOpportunity;
		[PXButton]
		[PXUIField(DisplayName = "", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		[PXEditDetailButton]
		public virtual IEnumerable viewSuggestedOpportunity(PXAdapter adapter)
		{
			return RedirectToOpportunity(adapter, Records.Current?.SuggestedOpportunityID);
		}

		public PXAction<LSOpportunityMeetingNotesApproval> ViewDocument;
		[PXButton]
		[PXUIField(DisplayName = "", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		[PXEditDetailButton]
		public virtual IEnumerable viewDocument(PXAdapter adapter)
		{
			var row = Records.Current;
			if (row?.ApprovalID == null)
			{
				return adapter.Get();
			}

			var graph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
			var document = LSOpportunityMeetingNotesApproval.PK.Find(graph, row.ApprovalID);
			if (document == null)
			{
				return adapter.Get();
			}

			graph.Document.Current = document;

			throw new PXRedirectRequiredException(graph, true, string.Empty)
			{
				Mode = PXBaseRedirectException.WindowMode.Same,
			};
		}

		public PXAction<LSOpportunityMeetingNotesApproval> ViewActivity;
		[PXButton]
		[PXUIField(DisplayName = "", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		[PXEditDetailButton]
		public virtual IEnumerable viewActivity(PXAdapter adapter)
		{
			var row = Records.Current;
			if (row?.ActivityNoteID == null)
			{
				return adapter.Get();
			}

			var graph = PXGraph.CreateInstance<CRActivityMaint>();
			var activity = graph.Activities.Search<CRActivity.noteID>(row.ActivityNoteID);
			if (activity != null)
			{
				graph.Activities.Current = activity;

				throw new PXRedirectRequiredException(graph, true, string.Empty)
				{
					Mode = PXBaseRedirectException.WindowMode.NewWindow,
				};
			}

			return adapter.Get();
		}

		public PXAction<LSOpportunityMeetingNotesApproval> Reject;
		[PXButton(CommitChanges = true)]
		[PXUIField(DisplayName = "Reject", MapEnableRights = PXCacheRights.Update, MapViewRights = PXCacheRights.Select)]
		public virtual IEnumerable reject(PXAdapter adapter)
		{
			var rows = adapter.Get<LSOpportunityMeetingNotesApproval>();
			foreach (LSOpportunityMeetingNotesApproval row in rows)
			{
				if (row?.ApprovalID == null)
				{
					continue;
				}

				PXProcessing<LSOpportunityMeetingNotesApproval>.SetCurrentItem(row);
				LSOpportunityMeetingNotesApprovalApprovalService.Reject(this, row.ApprovalID);
				PXProcessing<LSOpportunityMeetingNotesApproval>.SetInfo("Rejected.");
			}

			return adapter.Get();
		}

		public static void Approve(LSOpportunityMeetingNotesApprovalProcess graph, LSOpportunityMeetingNotesApproval item)
		{
			graph.Approve(item);
		}

		public virtual void Approve(LSOpportunityMeetingNotesApproval item)
		{
			if (item?.ApprovalID == null)
			{
				return;
			}

			PXProcessing<LSOpportunityMeetingNotesApproval>.SetCurrentItem(item);

			var row = LSOpportunityMeetingNotesApproval.PK.Find(this, item.ApprovalID);
			if (row == null)
			{
				throw new PXException("The approval record no longer exists.");
			}

			if (row.Status == LSOpportunityMeetingNotesApprovalStatus.Approved)
			{
				PXProcessing<LSOpportunityMeetingNotesApproval>.SetInfo("The record is already approved.");
				return;
			}

			LSOpportunityMeetingNotesApprovalApprovalService.Approve(this, row.ApprovalID);
			PXProcessing<LSOpportunityMeetingNotesApproval>.SetInfo("Approved.");
		}

		private IEnumerable RedirectToOpportunity(PXAdapter adapter, string opportunityID)
		{
			if (string.IsNullOrWhiteSpace(opportunityID))
			{
				return adapter.Get();
			}

			var graph = PXGraph.CreateInstance<OpportunityMaint>();
			var opportunity = CROpportunity.PK.Find(graph, opportunityID);
			if (opportunity == null)
			{
				return adapter.Get();
			}

			graph.Opportunity.Current = opportunity;

			throw new PXRedirectRequiredException(graph, true, string.Empty)
			{
				Mode = PXBaseRedirectException.WindowMode.NewWindow,
			};
		}
	}
}
