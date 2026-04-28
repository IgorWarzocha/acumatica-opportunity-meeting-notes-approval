using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using PX.Common;
using PX.Data;
using PX.Objects.CR;
using PX.Objects.EP;
using PX.SM;
using LS.OpportunityMeetingNotesApproval.DAC;
using LS.OpportunityMeetingNotesApproval.Helper;
using Approval = LS.OpportunityMeetingNotesApproval.DAC.LSOpportunityMeetingNotesApproval;

namespace LS.OpportunityMeetingNotesApproval.Graph
{
	public class LSOpportunityMeetingNotesApprovalEntry : PXGraph<LSOpportunityMeetingNotesApprovalEntry, Approval>
	{
		private bool _persistingTranscriptAttachments;

		#region Views
		[PXCopyPasteHiddenFields(typeof(Approval.transcriptHtml), typeof(Approval.matchDiagnostics))]
		public PXSelect<Approval> Document;

		#endregion

		#region Actions
		public PXAction<Approval> Approve;
		[PXButton(CommitChanges = true)]
		[PXUIField(DisplayName = "Approve", MapEnableRights = PXCacheRights.Update, MapViewRights = PXCacheRights.Select)]
		public virtual IEnumerable approve(PXAdapter adapter)
		{
			List<Approval> list = adapter.Get<Approval>().ToList();
			bool massProcess = adapter.MassProcess;

			PXLongOperation.StartOperation(this, () =>
			{
				ApproveMethod(list, massProcess);
			});

			return list;
		}

		public PXAction<Approval> Reject;
		[PXButton(CommitChanges = true)]
		[PXUIField(DisplayName = "Reject", MapEnableRights = PXCacheRights.Update, MapViewRights = PXCacheRights.Select)]
		public virtual IEnumerable reject(PXAdapter adapter)
		{
			List<Approval> list = adapter.Get<Approval>().ToList();
			bool massProcess = adapter.MassProcess;

			PXLongOperation.StartOperation(this, () =>
			{
				RejectMethod(list, massProcess);
			});

			return list;
		}

		public PXAction<Approval> ViewSuggestedOpportunity;
		[PXButton]
		[PXUIField(DisplayName = "View Suggested Opportunity", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		public virtual IEnumerable viewSuggestedOpportunity(PXAdapter adapter)
		{
			return RedirectToOpportunity(adapter, Document.Current?.SuggestedOpportunityID);
		}

		public PXAction<Approval> ViewConfirmedOpportunity;
		[PXButton]
		[PXUIField(DisplayName = "View Confirmed Opportunity", MapEnableRights = PXCacheRights.Select, MapViewRights = PXCacheRights.Select)]
		public virtual IEnumerable viewConfirmedOpportunity(PXAdapter adapter)
		{
			return RedirectToOpportunity(adapter, Document.Current?.ConfirmedOpportunityID);
		}
		#endregion

		#region Events
		protected virtual void _(Events.RowSelected<Approval> e)
		{
			if (e.Row == null)
			{
				return;
			}

			bool isApproved = e.Row.Status == LSOpportunityMeetingNotesApprovalStatus.Approved;
			PXUIFieldAttribute.SetEnabled<Approval.confirmedOpportunityID>(e.Cache, e.Row, !isApproved);
			PXUIFieldAttribute.SetEnabled<Approval.suggestedOpportunityID>(e.Cache, e.Row, !isApproved);
			PXUIFieldAttribute.SetEnabled<Approval.transcriptHtml>(e.Cache, e.Row, !isApproved);
		}

		protected virtual void _(Events.FieldSelecting<Approval, Approval.transcriptHtml> e)
		{
			if (e.Row == null)
			{
				return;
			}

			e.ReturnValue = string.IsNullOrWhiteSpace(e.Row.TranscriptHtml)
				? GetTranscriptAttachmentHtml(e.Cache.Graph, e.Row)
				: e.Row.TranscriptHtml;
		}

		protected virtual void _(Events.RowPersisting<Approval> e)
		{
			if (e.Row == null || e.Operation.Command() == PXDBOperation.Delete)
			{
				return;
			}

			if (!string.IsNullOrWhiteSpace(e.Row.ExternalMeetingID))
			{
				Approval duplicate = PXSelectReadonly<
						Approval,
						Where<
							Approval.externalMeetingID, Equal<Required<Approval.externalMeetingID>>,
							And<Approval.approvalID, NotEqual<Required<Approval.approvalID>>>>>
					.SelectWindowed(this, 0, 1, e.Row.ExternalMeetingID, e.Row.ApprovalID ?? -1)
					.TopFirst;

				if (duplicate != null)
				{
					throw new PXSetPropertyException<Approval.externalMeetingID>(LSOpportunityMeetingNotesApprovalMessages.ExternalMeetingIdMustBeUnique);
				}
			}
		}
		#endregion

		#region Persist
		public override void Persist()
		{
			if (_persistingTranscriptAttachments)
			{
				base.Persist();
				return;
			}

			List<(Approval Row, string TranscriptHtml)> transcriptRows = Document.Cache.Cached
				.Cast<Approval>()
				.Where(row => row != null)
				.Select(row => (Row: row, TranscriptHtml: row.TranscriptHtml))
				.Where(item => !string.IsNullOrWhiteSpace(item.TranscriptHtml))
				.Where(item =>
				{
					PXEntryStatus status = Document.Cache.GetStatus(item.Row);
					return status == PXEntryStatus.Inserted || status == PXEntryStatus.Updated;
				})
				.ToList();

			using (PXTransactionScope scope = new PXTransactionScope())
			{
				base.Persist();

				bool hasAttachmentChanges = false;
				foreach ((Approval row, string transcriptHtml) in transcriptRows)
				{
					if (PersistTranscriptAttachment(Document.Cache, row, transcriptHtml))
					{
						Document.Update(row);
						hasAttachmentChanges = true;
					}
				}

				if (hasAttachmentChanges)
				{
					_persistingTranscriptAttachments = true;
					try
					{
						base.Persist();
					}
					finally
					{
						_persistingTranscriptAttachments = false;
					}
				}

				scope.Complete();
			}
		}
		#endregion

		#region Processing Methods
		public static void ApproveMethod(List<Approval> list, bool massProcess)
		{
			for (int i = 0; i < list.Count; i++)
			{
				Approval approvalRecord = list[i];

				try
				{
					using (PXTransactionScope scope = new PXTransactionScope())
					{
						LSOpportunityMeetingNotesApprovalEntry graph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
						approvalRecord = Approval.PK.Find(graph, approvalRecord?.ApprovalID);

						if (approvalRecord == null)
						{
							throw new PXException(LSOpportunityMeetingNotesApprovalMessages.ApprovalRecordNoLongerExists);
						}

						if (approvalRecord.Status == LSOpportunityMeetingNotesApprovalStatus.Approved)
						{
							if (massProcess)
							{
								PXProcessing<Approval>.SetInfo(i, LSOpportunityMeetingNotesApprovalMessages.RecordAlreadyApproved);
							}
							continue;
						}

						if (string.IsNullOrWhiteSpace(approvalRecord.ConfirmedOpportunityID))
						{
							throw new PXSetPropertyException<Approval.confirmedOpportunityID>(LSOpportunityMeetingNotesApprovalMessages.ConfirmedOpportunityIsRequired);
						}

						CROpportunity opportunity = FindOpportunity(graph, approvalRecord.ConfirmedOpportunityID);
						if (opportunity == null)
						{
							throw new PXException(LSOpportunityMeetingNotesApprovalMessages.OpportunityNotFound, approvalRecord.ConfirmedOpportunityID);
						}

						string transcriptHtml = GetTranscriptAttachmentHtml(graph, approvalRecord);
						if (string.IsNullOrWhiteSpace(transcriptHtml))
						{
							throw new PXException(LSOpportunityMeetingNotesApprovalMessages.TranscriptHtmlIsRequiredForApproval);
						}

						CRActivityMaint activityGraph = PXGraph.CreateInstance<CRActivityMaint>();
						CRActivity activity = activityGraph.Activities.Insert();

						activity.Subject = string.IsNullOrWhiteSpace(approvalRecord.MeetingTitle)
							? LSOpportunityMeetingNotesApprovalMessages.DefaultMeetingNotesSummarySubject
							: approvalRecord.MeetingTitle;
						activity.RefNoteID = opportunity.NoteID;
						activity.BAccountID = opportunity.BAccountID;
						activity.ContactID = opportunity.ContactID;
						activity.StartDate = approvalRecord.MeetingDate;
						activity.EndDate = approvalRecord.MeetingDate;
						activity.Body = transcriptHtml;
						activity = activityGraph.Activities.Update(activity);

						EnsureTranscriptAttachmentOnActivity(activityGraph.Activities.Cache, activity, approvalRecord, transcriptHtml);

						activityGraph.Actions.PressSave();

						approvalRecord.Status = LSOpportunityMeetingNotesApprovalStatus.Approved;
						approvalRecord.ActivityNoteID = activity.NoteID;
						approvalRecord.ApprovedByID = graph.Accessinfo.UserID;
						approvalRecord.ApprovedDateTime = PXTimeZoneInfo.Now;
						approvalRecord.ErrorMessage = null;
						graph.Document.Update(approvalRecord);
						graph.Actions.PressSave();

						scope.Complete();
					}

					if (massProcess)
					{
						PXProcessing<Approval>.SetInfo(i, LSOpportunityMeetingNotesApprovalMessages.RecordApproved);
					}
				}
				catch (PXException ex)
				{
					MarkAsError(approvalRecord?.ApprovalID, ex.Message);
					if (massProcess)
					{
						PXProcessing<Approval>.SetError(i, ex);
					}
					else
					{
						throw;
					}
				}
				catch (Exception ex)
				{
					MarkAsError(approvalRecord?.ApprovalID, ex.Message);
					if (massProcess)
					{
						PXProcessing<Approval>.SetError(i, ex);
					}
					else
					{
						throw;
					}
				}
			}
		}

		public static void RejectMethod(List<Approval> list, bool massProcess)
		{
			for (int i = 0; i < list.Count; i++)
			{
				Approval approvalRecord = list[i];

				try
				{
					using (PXTransactionScope scope = new PXTransactionScope())
					{
						LSOpportunityMeetingNotesApprovalEntry graph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
						approvalRecord = Approval.PK.Find(graph, approvalRecord?.ApprovalID);

						if (approvalRecord == null)
						{
							throw new PXException(LSOpportunityMeetingNotesApprovalMessages.ApprovalRecordNoLongerExists);
						}

						if (approvalRecord.Status == LSOpportunityMeetingNotesApprovalStatus.Approved)
						{
							throw new PXException(LSOpportunityMeetingNotesApprovalMessages.ApprovedRecordsCannotBeRejected);
						}

						approvalRecord.Status = LSOpportunityMeetingNotesApprovalStatus.Rejected;
						approvalRecord.ErrorMessage = null;
						graph.Document.Update(approvalRecord);
						graph.Actions.PressSave();

						scope.Complete();
					}

					if (massProcess)
					{
						PXProcessing<Approval>.SetInfo(i, LSOpportunityMeetingNotesApprovalMessages.RecordRejected);
					}
				}
				catch (PXException ex)
				{
					if (massProcess)
					{
						PXProcessing<Approval>.SetError(i, ex);
					}
					else
					{
						throw;
					}
				}
			}
		}
		#endregion

		#region Helpers
		public static string GetTranscriptAttachmentHtml(PXGraph graph, Approval approvalRecord)
		{
			UploadFile file = GetTranscriptAttachment(graph, approvalRecord);
 
			if (file?.Data == null || file.Data.Length == 0)
			{
				return null;
			}

			return Encoding.UTF8.GetString(file.Data);
		}

		public static bool PersistTranscriptAttachment(PXCache targetCache, Approval approvalRecord, string transcriptHtml)
		{
			if (targetCache == null)
			{
				throw new PXArgumentException(nameof(targetCache));
			}

			if (approvalRecord == null || string.IsNullOrWhiteSpace(transcriptHtml))
			{
				return false;
			}

			UploadFile existingFile = GetTranscriptAttachment(targetCache.Graph, approvalRecord);
			byte[] transcriptBytes = Encoding.UTF8.GetBytes(transcriptHtml);
			if (existingFile?.Data != null && existingFile.Data.SequenceEqual(transcriptBytes))
			{
				return false;
			}

			UploadFileMaintenance uploadGraph = PXGraph.CreateInstance<UploadFileMaintenance>();
			string fileName = existingFile?.Name;
			if (string.IsNullOrWhiteSpace(fileName))
			{
				fileName = BuildTranscriptFileName(approvalRecord);
			}

			FileInfo file = existingFile?.FileID != null
				? new FileInfo(existingFile.FileID.Value, fileName, null, transcriptBytes)
				: new FileInfo(fileName, null, transcriptBytes);

			if (!uploadGraph.SaveFile(file, FileExistsAction.CreateVersion) || file.UID == null)
			{
				throw new PXException(LSOpportunityMeetingNotesApprovalMessages.TranscriptAttachmentCouldNotBeCreated);
			}

			Guid[] fileNotes = PXNoteAttribute.GetFileNotes(targetCache, approvalRecord) ?? Array.Empty<Guid>();
			Guid[] updatedFileNotes = fileNotes.Contains(file.UID.Value)
				? fileNotes
				: fileNotes.Concat(new[] { file.UID.Value }).ToArray();

			PXNoteAttribute.SetFileNotes(targetCache, approvalRecord, updatedFileNotes);
			PXNoteAttribute.ResetFileListCache(targetCache);
			return true;
		}

		public static bool EnsureTranscriptAttachmentOnActivity(PXCache targetCache, object targetRow, Approval approvalRecord, string transcriptHtml)
		{
			if (targetCache == null)
			{
				throw new PXArgumentException(nameof(targetCache));
			}

			if (targetRow == null || string.IsNullOrWhiteSpace(transcriptHtml))
			{
				return false;
			}

			Guid[] existingFiles = PXNoteAttribute.GetFileNotes(targetCache, targetRow) ?? Array.Empty<Guid>();
			if (existingFiles.Length > 0)
			{
				return false;
			}

			UploadFileMaintenance uploadGraph = PXGraph.CreateInstance<UploadFileMaintenance>();
			string fileName = BuildTranscriptFileName(approvalRecord);
			FileInfo file = new FileInfo(fileName, null, Encoding.UTF8.GetBytes(transcriptHtml));
			if (!uploadGraph.SaveFile(file, FileExistsAction.CreateVersion) || file.UID == null)
			{
				throw new PXException(LSOpportunityMeetingNotesApprovalMessages.TranscriptAttachmentCouldNotBeCreated);
			}

			PXNoteAttribute.SetFileNotes(targetCache, targetRow, new[] { file.UID.Value });
			targetCache.Update(targetRow);
			return true;
		}

		public static UploadFile GetTranscriptAttachment(PXGraph graph, Approval approvalRecord)
		{
			if (graph == null || approvalRecord == null)
			{
				return null;
			}

			PXCache cache = graph.Caches[typeof(Approval)];
			Guid[] fileNotes = PXNoteAttribute.GetFileNotes(cache, approvalRecord) ?? Array.Empty<Guid>();
			if (fileNotes.Length == 0)
			{
				return null;
			}

			string expectedFileName = BuildTranscriptFileName(approvalRecord);
			UploadFile[] files = fileNotes
				.Select(fileID => GetFile(graph, fileID))
				.Where(file => file?.Name != null)
				.ToArray();

			return files.FirstOrDefault(file => string.Equals(file.Name, expectedFileName, StringComparison.OrdinalIgnoreCase))
				?? files.FirstOrDefault(file => file.Name.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
				?? files.FirstOrDefault();
		}

		public static UploadFile GetFile(PXGraph graph, Guid fileID)
		{
			PXResult<UploadFile, UploadFileRevision> result = (PXResult<UploadFile, UploadFileRevision>)PXSelectJoin<
				UploadFile,
				InnerJoin<UploadFileRevision,
					On<UploadFile.fileID, Equal<UploadFileRevision.fileID>,
					And<UploadFile.lastRevisionID, Equal<UploadFileRevision.fileRevisionID>>>>,
				Where<UploadFile.fileID, Equal<Required<UploadFile.fileID>>>>
				.Select(graph, fileID);

			if (result == null)
			{
				return null;
			}

			UploadFile file = result;
			UploadFileRevision revision = result;
			file.Data = revision.Data;
			return file;
		}

		public static CROpportunity FindOpportunity(PXGraph graph, string opportunityID)
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

			LSOpportunityMeetingNotesApprovalEntry graph = PXGraph.CreateInstance<LSOpportunityMeetingNotesApprovalEntry>();
			Approval approvalRecord = Approval.PK.Find(graph, approvalID);
			if (approvalRecord == null || approvalRecord.Status == LSOpportunityMeetingNotesApprovalStatus.Approved)
			{
				return;
			}

			approvalRecord.Status = LSOpportunityMeetingNotesApprovalStatus.Error;
			approvalRecord.ErrorMessage = errorMessage;
			graph.Document.Update(approvalRecord);
			graph.Actions.PressSave();
		}

		private static string BuildTranscriptFileName(Approval approvalRecord)
		{
			string seed = approvalRecord?.ExternalMeetingID;
			if (string.IsNullOrWhiteSpace(seed))
			{
				seed = approvalRecord?.ApprovalID?.ToString();
			}

			if (string.IsNullOrWhiteSpace(seed))
			{
				seed = "meeting-notes";
			}

			string sanitized = new string(seed.Select(ch => char.IsLetterOrDigit(ch) || ch == '-' || ch == '_' ? ch : '-').ToArray()).Trim('-');
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
				throw new PXException(LSOpportunityMeetingNotesApprovalMessages.OpportunityNotFound, opportunityID);
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
