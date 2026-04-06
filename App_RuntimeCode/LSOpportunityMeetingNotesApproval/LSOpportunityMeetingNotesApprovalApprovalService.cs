using System;
using System.Linq;
using System.Text;
using PX.Common;
using PX.Data;
using PX.Objects.CR;
using PX.Objects.EP;
using PX.SM;

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
				throw new PXException(LSOpportunityMeetingNotesApprovalMessages.ApprovalIdIsRequired);
			}

			try
			{
				using (var scope = new PXTransactionScope())
				{
					var entryGraph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
					var row = LSOpportunityMeetingNotesApproval.PK.Find(entryGraph, approvalID);
					if (row == null)
					{
						throw new PXException(LSOpportunityMeetingNotesApprovalMessages.ApprovalRecordNoLongerExists);
					}

					if (row.Status == LSOpportunityMeetingNotesApprovalStatus.Approved)
					{
						return;
					}

					if (string.IsNullOrWhiteSpace(row.ConfirmedOpportunityID))
					{
						throw new PXSetPropertyException<LSOpportunityMeetingNotesApproval.confirmedOpportunityID>(LSOpportunityMeetingNotesApprovalMessages.ConfirmedOpportunityIsRequired);
					}

					var opportunity = FindOpportunity(entryGraph, row.ConfirmedOpportunityID);
					if (opportunity == null)
					{
						throw new PXException(LSOpportunityMeetingNotesApprovalMessages.OpportunityNotFound, row.ConfirmedOpportunityID);
					}

					var activityGraph = PXGraph.CreateInstance<CRActivityMaint>();
					var activity = (CRActivity)activityGraph.Activities.Cache.CreateInstance();
					var activityBody = string.IsNullOrWhiteSpace(row.TranscriptHtml) ? row.MeetingSummary : row.TranscriptHtml;

					activity.Subject = string.IsNullOrWhiteSpace(row.Subject)
						? string.IsNullOrWhiteSpace(row.MeetingTitle) ? LSOpportunityMeetingNotesApprovalMessages.DefaultMeetingNotesSummarySubject : row.MeetingTitle
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

					EnsureTranscriptAttachment(entryGraph, row);
					MoveFilesToActivity(entryGraph.Document.Cache, row, activityGraph.Activities.Cache, activity);

					activityGraph.Actions.PressSave();

					row.Status = LSOpportunityMeetingNotesApprovalStatus.Approved;
					row.ActivityNoteID = activity.NoteID;
					row.ApprovedByID = context.Accessinfo.UserID;
					row.ApprovedDateTime = PXTimeZoneInfo.Now;
					row.ErrorMessage = null;
					row.PostApprovalSyncStatus = LSOpportunityMeetingNotesApprovalSyncStatus.NotReady;
					row.PostApprovalSyncDateTime = null;
					row.PostApprovalSyncError = null;
					row.Processed = false;
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
				throw new PXException(LSOpportunityMeetingNotesApprovalMessages.ApprovalIdIsRequired);
			}

			var entryGraph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
			var row = LSOpportunityMeetingNotesApproval.PK.Find(entryGraph, approvalID);
			if (row == null)
			{
				throw new PXException(LSOpportunityMeetingNotesApprovalMessages.ApprovalRecordNoLongerExists);
			}

			if (row.Status == LSOpportunityMeetingNotesApprovalStatus.Approved)
			{
				throw new PXException(LSOpportunityMeetingNotesApprovalMessages.ApprovedRecordsCannotBeRejected);
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

		public static bool EnsureTranscriptAttachment(PXGraph context, LSOpportunityMeetingNotesApproval row)
		{
			if (context == null)
			{
				throw new PXArgumentException(nameof(context));
			}

			if (row?.NoteID == null || string.IsNullOrWhiteSpace(row.TranscriptHtml))
			{
				return false;
			}

			var cache = context.Caches<LSOpportunityMeetingNotesApproval>();
			var existingFiles = PXNoteAttribute.GetFileNotes(cache, row) ?? Array.Empty<Guid>();
			if (existingFiles.Length > 0)
			{
				return false;
			}

			var uploadGraph = PXGraph.CreateInstance<UploadFileMaintenance>();
			var fileName = BuildTranscriptFileName(row);
			var file = new FileInfo(fileName, null, Encoding.UTF8.GetBytes(row.TranscriptHtml));
			if (!uploadGraph.SaveFile(file, FileExistsAction.CreateVersion) || file.UID == null)
			{
				throw new PXException("The transcript attachment could not be created.");
			}

			PXNoteAttribute.SetFileNotes(cache, row, new[] { file.UID.Value });
			cache.Update(row);
			return true;
		}

		private static void MoveFilesToActivity(PXCache sourceCache, object sourceRow, PXCache targetCache, object targetRow)
		{
			var files = PXNoteAttribute.GetFileNotes(sourceCache, sourceRow);
			if (files == null || files.Length == 0)
			{
				return;
			}

			PXNoteAttribute.SetFileNotes(targetCache, targetRow, files);
			PXNoteAttribute.SetFileNotes(sourceCache, sourceRow, Array.Empty<Guid>());
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

		private static string BuildTranscriptFileName(LSOpportunityMeetingNotesApproval row)
		{
			var seed = row?.ExternalMeetingID;
			if (string.IsNullOrWhiteSpace(seed))
			{
				seed = row?.ApprovalID?.ToString();
			}

			if (string.IsNullOrWhiteSpace(seed))
			{
				seed = "meeting-notes";
			}

			var sanitized = new string(seed
				.Select(ch => char.IsLetterOrDigit(ch) || ch == '-' || ch == '_' ? ch : '-')
				.ToArray())
				.Trim('-');

			if (string.IsNullOrWhiteSpace(sanitized))
			{
				sanitized = "meeting-notes";
			}

			if (sanitized.Length > 80)
			{
				sanitized = sanitized.Substring(0, 80).Trim('-');
			}

			return sanitized + ".html";
		}
	}
}
