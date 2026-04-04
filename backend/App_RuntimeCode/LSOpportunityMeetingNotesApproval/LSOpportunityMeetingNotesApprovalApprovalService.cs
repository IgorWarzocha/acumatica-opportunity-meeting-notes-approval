using System;
using PX.Common;
using PX.Data;
using PX.Objects.CR;
using PX.Objects.EP;

namespace PX.Objects.LS
{
	public static class LSOpportunityMeetingNotesApprovalApprovalService
	{
		public static void Approve(PXGraph context, int? approvalID)
		{
			if (context == null)
			{
				throw new PXArgumentException(nameof(context));
			}

			if (approvalID == null)
			{
				throw new PXException("Approval ID is required.");
			}

			try
			{
				using (var scope = new PXTransactionScope())
				{
					var entryGraph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
					var row = LSOpportunityMeetingNotesApproval.PK.Find(entryGraph, approvalID);
					if (row == null)
					{
						throw new PXException("The approval record no longer exists.");
					}

					if (row.Status == LSOpportunityMeetingNotesApprovalStatus.Approved)
					{
						return;
					}

					if (string.IsNullOrWhiteSpace(row.ConfirmedOpportunityID))
					{
						throw new PXSetPropertyException<LSOpportunityMeetingNotesApproval.confirmedOpportunityID>("Confirmed Opportunity is required.");
					}

					var opportunity = FindOpportunity(entryGraph, row.ConfirmedOpportunityID);
					if (opportunity == null)
					{
						throw new PXException(string.Format("Opportunity '{0}' was not found.", row.ConfirmedOpportunityID));
					}

					var activityGraph = PXGraph.CreateInstance<CRActivityMaint>();
					var activity = (CRActivity)activityGraph.Activities.Cache.CreateInstance();
					var activityBody = string.IsNullOrWhiteSpace(row.TranscriptHtml) ? row.MeetingSummary : row.TranscriptHtml;

					activity.Subject = string.IsNullOrWhiteSpace(row.Subject)
						? string.IsNullOrWhiteSpace(row.MeetingTitle) ? "Meeting Notes Summary" : row.MeetingTitle
						: row.Subject;
					activity.RefNoteID = opportunity.NoteID;
					activity.BAccountID = opportunity.BAccountID ?? row.BusinessAccountID;
					activity.ContactID = opportunity.ContactID ?? row.ContactID;
					activity.StartDate = row.MeetingDate;
					activity.EndDate = row.MeetingDate;
					activity.Body = activityBody;

					activity = (CRActivity)activityGraph.Activities.Insert(activity);
					activity.Body = activityBody;
					activity = activityGraph.Activities.Update(activity);

					CopyFiles(entryGraph.Document.Cache, row, activityGraph.Activities.Cache, activity);

					activityGraph.Actions.PressSave();

					row.Status = LSOpportunityMeetingNotesApprovalStatus.Approved;
					row.ActivityNoteID = activity.NoteID;
					row.ApprovedByID = context.Accessinfo.UserID;
					row.ApprovedDateTime = PXTimeZoneInfo.Now;
					row.ErrorMessage = null;
					row.PostApprovalSyncStatus = LSOpportunityMeetingNotesApprovalSyncStatus.Synced;
					row.PostApprovalSyncDateTime = row.ApprovedDateTime;
					row.PostApprovalSyncError = null;
					row.Processed = true;
					row.BusinessAccountID = activity.BAccountID;
					row.ContactID = activity.ContactID;
					entryGraph.Document.Update(row);
					entryGraph.Actions.PressSave();

					scope.Complete();
				}
			}
			catch (Exception ex)
			{
				MarkAsError(approvalID, ex.Message);
				throw;
			}
		}

		public static void Reject(PXGraph context, int? approvalID)
		{
			if (context == null)
			{
				throw new PXArgumentException(nameof(context));
			}

			if (approvalID == null)
			{
				throw new PXException("Approval ID is required.");
			}

			var entryGraph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
			var row = LSOpportunityMeetingNotesApproval.PK.Find(entryGraph, approvalID);
			if (row == null)
			{
				throw new PXException("The approval record no longer exists.");
			}

			if (row.Status == LSOpportunityMeetingNotesApprovalStatus.Approved)
			{
				throw new PXException("Approved records cannot be rejected.");
			}

			row.Status = LSOpportunityMeetingNotesApprovalStatus.Rejected;
			row.ErrorMessage = null;
			row.PostApprovalSyncStatus = LSOpportunityMeetingNotesApprovalSyncStatus.NotReady;
			row.PostApprovalSyncDateTime = PXTimeZoneInfo.Now;
			row.PostApprovalSyncError = null;
			row.Processed = true;
			entryGraph.Document.Update(row);
			entryGraph.Actions.PressSave();
		}

		private static void CopyFiles(PXCache sourceCache, object sourceRow, PXCache targetCache, object targetRow)
		{
			var files = PXNoteAttribute.GetFileNotes(sourceCache, sourceRow);
			if (files == null || files.Length == 0)
			{
				return;
			}

			PXNoteAttribute.SetFileNotes(targetCache, targetRow, files);
		}

		private static CROpportunity FindOpportunity(PXGraph graph, string opportunityID)
		{
			if (graph == null || string.IsNullOrWhiteSpace(opportunityID))
			{
				return null;
			}

			return PXSelectReadonly<
					CROpportunity,
					Where<
						CROpportunity.opportunityID, Equal<Required<CROpportunity.opportunityID>>,
						And<
							CROpportunity.status, NotEqual<LSOpportunityMeetingNotesApprovalOpportunityStatus.lost>,
							And<CROpportunity.status, NotEqual<LSOpportunityMeetingNotesApprovalOpportunityStatus.won>>>>>
				.SelectWindowed(graph, 0, 1, opportunityID)
				.TopFirst;
		}

		private static void MarkAsError(int? approvalID, string errorMessage)
		{
			if (approvalID == null)
			{
				return;
			}

			var entryGraph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
			var row = LSOpportunityMeetingNotesApproval.PK.Find(entryGraph, approvalID);
			if (row == null || row.Status == LSOpportunityMeetingNotesApprovalStatus.Approved)
			{
				return;
			}

			row.Status = LSOpportunityMeetingNotesApprovalStatus.Error;
			row.ErrorMessage = errorMessage;
			row.PostApprovalSyncStatus = LSOpportunityMeetingNotesApprovalSyncStatus.Error;
			row.PostApprovalSyncDateTime = PXTimeZoneInfo.Now;
			row.PostApprovalSyncError = errorMessage;
			row.Processed = false;
			entryGraph.Document.Update(row);
			entryGraph.Actions.PressSave();
		}
	}
}
