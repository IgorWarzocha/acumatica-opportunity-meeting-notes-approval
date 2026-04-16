using System;
using System.Collections;
using System.Collections.Generic;
using PX.Data;
using PX.Objects.CR;
using PX.Objects.EP;

namespace LSOpportunityMeetingNotesApproval
{
	public class LSOpportunityMeetingNotesApprovalProcess : PXGraph<LSOpportunityMeetingNotesApprovalProcess>
	{
		#region Views
		public PXSave<LSOpportunityMeetingNotesApproval> Save;
		public PXCancel<LSOpportunityMeetingNotesApproval> Cancel;

		[PXFilterable]
		public PXProcessing<LSOpportunityMeetingNotesApproval> Records;
		#endregion

		#region Ctor
		public LSOpportunityMeetingNotesApprovalProcess()
		{
			Records.SetSelected<LSOpportunityMeetingNotesApproval.selected>();
			Records.SetProcessCaption("Approve");
			Records.SetProcessAllCaption("Approve All");
			Records.SetProcessDelegate(delegate(List<LSOpportunityMeetingNotesApproval> list)
			{
				LSOpportunityMeetingNotesApprovalEntry.ApproveMethod(list, true);
			});
		}
		#endregion

		#region Data Delegate
		protected virtual IEnumerable records()
		{
			return PXSelect<
					LSOpportunityMeetingNotesApproval,
					Where<LSOpportunityMeetingNotesApproval.status, NotEqual<LSOpportunityMeetingNotesApprovalStatus.approved>>>
				.Select(this);
		}
		#endregion

		#region Actions
		public PXAction<LSOpportunityMeetingNotesApproval> Reject;
		[PXButton(CommitChanges = true)]
		[PXUIField(DisplayName = "Reject", MapEnableRights = PXCacheRights.Update, MapViewRights = PXCacheRights.Select)]
		public virtual IEnumerable reject(PXAdapter adapter)
		{
			List<LSOpportunityMeetingNotesApproval> list = new List<LSOpportunityMeetingNotesApproval>();
			foreach (LSOpportunityMeetingNotesApproval approvalRecord in adapter.Get<LSOpportunityMeetingNotesApproval>())
			{
				if (approvalRecord != null)
				{
					list.Add(approvalRecord);
				}
			}

			bool massProcess = adapter.MassProcess;
			PXLongOperation.StartOperation(this, () =>
			{
				LSOpportunityMeetingNotesApprovalEntry.RejectMethod(list, massProcess);
			});

			return adapter.Get();
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
			LSOpportunityMeetingNotesApproval approvalRecord = Records.Current;
			if (approvalRecord?.ApprovalID == null)
			{
				return adapter.Get();
			}

			LSOpportunityMeetingNotesApprovalEntry graph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
			LSOpportunityMeetingNotesApproval document = LSOpportunityMeetingNotesApproval.PK.Find(graph, approvalRecord.ApprovalID);
			if (document == null)
			{
				return adapter.Get();
			}

			PXRedirectHelper.TryRedirect(Records.Cache, document, string.Empty, PXRedirectHelper.WindowMode.Same);
			return adapter.Get();
		}

		public PXAction<LSOpportunityMeetingNotesApproval> ViewActivity;
		[PXButton]
		[PXUIField(DisplayName = "", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		[PXEditDetailButton]
		public virtual IEnumerable viewActivity(PXAdapter adapter)
		{
			LSOpportunityMeetingNotesApproval approvalRecord = Records.Current;
			if (approvalRecord?.ActivityNoteID == null)
			{
				return adapter.Get();
			}

			CRActivityMaint graph = PXGraph.CreateInstance<CRActivityMaint>();
			CRActivity activity = graph.Activities.Search<CRActivity.noteID>(approvalRecord.ActivityNoteID);
			if (activity == null)
			{
				return adapter.Get();
			}

			graph.Activities.Current = activity;
			throw new PXRedirectRequiredException(graph, true, string.Empty)
			{
				Mode = PXBaseRedirectException.WindowMode.NewWindow,
			};
		}
		#endregion

		#region Helpers
		private IEnumerable RedirectToOpportunity(PXAdapter adapter, string opportunityID)
		{
			if (string.IsNullOrWhiteSpace(opportunityID))
			{
				return adapter.Get();
			}

			OpportunityMaint graph = PXGraph.CreateInstance<OpportunityMaint>();
			CROpportunity opportunity = CROpportunity.PK.Find(graph, opportunityID);
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
		#endregion
	}
}
