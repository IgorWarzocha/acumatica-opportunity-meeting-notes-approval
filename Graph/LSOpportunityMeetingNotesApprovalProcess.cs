using System;
using System.Collections;
using System.Collections.Generic;
using PX.Data;
using PX.Objects.CR;
using PX.Objects.EP;
using LSOpportunityMeetingNotesApproval.DAC;
using LSOpportunityMeetingNotesApproval.Helper;
using Approval = LSOpportunityMeetingNotesApproval.DAC.LSOpportunityMeetingNotesApproval;

namespace LSOpportunityMeetingNotesApproval.Graph
{
	public class LSOpportunityMeetingNotesApprovalProcess : PXGraph<LSOpportunityMeetingNotesApprovalProcess>
	{
		#region Views
		public PXSave<Approval> Save;
		public PXCancel<Approval> Cancel;

		[PXFilterable]
		public PXProcessing<Approval> Records;
		#endregion

		#region Ctor
		public LSOpportunityMeetingNotesApprovalProcess()
		{
			Records.SetSelected<Approval.selected>();
			Records.SetProcessCaption("Approve");
			Records.SetProcessAllCaption("Approve All");
			Records.SetProcessDelegate(delegate(List<Approval> list)
			{
				LSOpportunityMeetingNotesApprovalEntry.ApproveMethod(list, true);
			});
		}
		#endregion

		#region Data Delegate
		protected virtual IEnumerable records()
		{
			return PXSelect<
					Approval,
					Where<Approval.status, NotEqual<LSOpportunityMeetingNotesApprovalStatus.approved>>>
				.Select(this);
		}
		#endregion

		#region Actions
		public PXAction<Approval> Reject;
		[PXButton(CommitChanges = true)]
		[PXUIField(DisplayName = "Reject", MapEnableRights = PXCacheRights.Update, MapViewRights = PXCacheRights.Select)]
		public virtual IEnumerable reject(PXAdapter adapter)
		{
			List<Approval> list = new List<Approval>();
			foreach (Approval approvalRecord in adapter.Get<Approval>())
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

		public PXAction<Approval> ViewOpportunity;
		[PXButton]
		[PXUIField(DisplayName = "", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		[PXEditDetailButton]
		public virtual IEnumerable viewOpportunity(PXAdapter adapter)
		{
			return RedirectToOpportunity(adapter, Records.Current?.ConfirmedOpportunityID);
		}

		public PXAction<Approval> ViewSuggestedOpportunity;
		[PXButton]
		[PXUIField(DisplayName = "", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		[PXEditDetailButton]
		public virtual IEnumerable viewSuggestedOpportunity(PXAdapter adapter)
		{
			return RedirectToOpportunity(adapter, Records.Current?.SuggestedOpportunityID);
		}

		public PXAction<Approval> ViewDocument;
		[PXButton]
		[PXUIField(DisplayName = "", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		[PXEditDetailButton]
		public virtual IEnumerable viewDocument(PXAdapter adapter)
		{
			Approval approvalRecord = Records.Current;
			if (approvalRecord?.ApprovalID == null)
			{
				return adapter.Get();
			}

			LSOpportunityMeetingNotesApprovalEntry graph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
			Approval document = Approval.PK.Find(graph, approvalRecord.ApprovalID);
			if (document == null)
			{
				return adapter.Get();
			}

			PXRedirectHelper.TryRedirect(Records.Cache, document, string.Empty, PXRedirectHelper.WindowMode.Same);
			return adapter.Get();
		}

		public PXAction<Approval> ViewActivity;
		[PXButton]
		[PXUIField(DisplayName = "", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		[PXEditDetailButton]
		public virtual IEnumerable viewActivity(PXAdapter adapter)
		{
			Approval approvalRecord = Records.Current;
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
