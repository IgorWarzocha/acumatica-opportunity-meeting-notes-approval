using System;
using PX.Data;
using PX.Data.BQL;
using PX.Objects.CR;

namespace LSOpportunityMeetingNotesApproval
{
	public static class LSOpportunityMeetingNotesApprovalOpportunityStatus
	{
		public const string Lost = "L";
		public const string Won = "W";

		public class lost : BqlString.Constant<lost>
		{
			public lost() : base(Lost)
			{
			}
		}

		public class won : BqlString.Constant<won>
		{
			public won() : base(Won)
			{
			}
		}
	}

	[Serializable]
	[PXCacheName("Opportunity Meeting Notes Approval")]
	[PXPrimaryGraph(typeof(LSOpportunityMeetingNotesApprovalEntry))]
	[PXTable]
	public class LSOpportunityMeetingNotesApproval : PXBqlTable, IBqlTable
	{
		public class PK
		{
			public static LSOpportunityMeetingNotesApproval Find(PXGraph graph, int? approvalID)
			{
				return PXSelect<
						LSOpportunityMeetingNotesApproval,
						Where<LSOpportunityMeetingNotesApproval.approvalID, Equal<Required<LSOpportunityMeetingNotesApproval.approvalID>>>>
					.SelectWindowed(graph, 0, 1, approvalID)
					.TopFirst;
			}
		}

		#region Selected
		public abstract class selected : BqlBool.Field<selected> { }

		[PXBool]
		[PXDefault(false, PersistingCheck = PXPersistingCheck.Nothing)]
		[PXUIField(DisplayName = "Selected")]
		public virtual bool? Selected { get; set; }
		#endregion

		#region ApprovalID
		public abstract class approvalID : BqlInt.Field<approvalID> { }

		[PXDBIdentity(IsKey = true)]
		[PXUIField(DisplayName = "Approval ID", Enabled = false, Visibility = PXUIVisibility.SelectorVisible)]
		public virtual int? ApprovalID { get; set; }
		#endregion

		#region ExternalMeetingID
		public abstract class externalMeetingID : BqlString.Field<externalMeetingID> { }

		[PXDBString(255, IsUnicode = true)]
		[PXDefault]
		[PXUIField(DisplayName = "External Meeting ID")]
		public virtual string ExternalMeetingID { get; set; }
		#endregion

		#region ExternalClientReferenceID
		public abstract class externalClientReferenceID : BqlString.Field<externalClientReferenceID> { }

		[PXDBString(255, IsUnicode = true)]
		[PXUIField(DisplayName = "External Client Reference ID")]
		public virtual string ExternalClientReferenceID { get; set; }
		#endregion

		#region Status
		public abstract class status : BqlString.Field<status> { }

		[PXDBString(1, IsFixed = true)]
		[PXDefault(LSOpportunityMeetingNotesApprovalStatus.Pending)]
		[LSOpportunityMeetingNotesApprovalStatus.List]
		[PXUIField(DisplayName = "Status")]
		public virtual string Status { get; set; }
		#endregion

		#region MeetingDate
		public abstract class meetingDate : BqlDateTime.Field<meetingDate> { }

		[PXDBDateAndTime(PreserveTime = true)]
		[PXDefault(typeof(AccessInfo.businessDate), PersistingCheck = PXPersistingCheck.Nothing)]
		[PXUIField(DisplayName = "Meeting Date")]
		public virtual DateTime? MeetingDate { get; set; }
		#endregion

		#region MeetingTitle
		public abstract class meetingTitle : BqlString.Field<meetingTitle> { }

		[PXDBString(255, IsUnicode = true)]
		[PXUIField(DisplayName = "Meeting Title")]
		public virtual string MeetingTitle { get; set; }
		#endregion

		#region Subject
		public abstract class subject : BqlString.Field<subject> { }

		[PXDBString(255, IsUnicode = true)]
		[PXUIField(DisplayName = "Activity Subject")]
		public virtual string Subject { get; set; }
		#endregion

		#region MeetingSummary
		public abstract class meetingSummary : BqlString.Field<meetingSummary> { }

		[PXDBText(IsUnicode = true)]
		[PXUIField(DisplayName = "Meeting Summary")]
		public virtual string MeetingSummary { get; set; }
		#endregion

		#region TranscriptHtml
		public abstract class transcriptHtml : BqlString.Field<transcriptHtml> { }

		[PXDBText(IsUnicode = true)]
		[PXUIField(DisplayName = "Transcript HTML")]
		public virtual string TranscriptHtml { get; set; }
		#endregion

		#region TranscriptUrl
		public abstract class transcriptUrl : BqlString.Field<transcriptUrl> { }

		[PXDBString(2048, IsUnicode = true)]
		[PXUIField(DisplayName = "Transcript URL")]
		public virtual string TranscriptUrl { get; set; }
		#endregion

		#region OrganizerEmail
		public abstract class organizerEmail : BqlString.Field<organizerEmail> { }

		[PXDBString(255, IsUnicode = true)]
		[PXUIField(DisplayName = "Organizer Email")]
		public virtual string OrganizerEmail { get; set; }
		#endregion

		#region ParticipantEmails
		public abstract class participantEmails : BqlString.Field<participantEmails> { }

		[PXDBText(IsUnicode = true)]
		[PXUIField(DisplayName = "Participant Emails")]
		public virtual string ParticipantEmails { get; set; }
		#endregion

		#region BAccountID
		public abstract class bAccountID : BqlInt.Field<bAccountID> { }

		[PXDBInt]
		[PXUIField(DisplayName = "Business Account", Visibility = PXUIVisibility.SelectorVisible)]
		[PXSelector(typeof(Search<BAccount.bAccountID>),
			SubstituteKey = typeof(BAccount.acctCD),
			DescriptionField = typeof(BAccount.acctName),
			SelectorMode = PXSelectorMode.DisplayModeHint,
			DirtyRead = true)]
		public virtual int? BAccountID { get; set; }
		#endregion

		#region ContactID
		public abstract class contactID : BqlInt.Field<contactID> { }

		[PXDBInt]
		[PXUIField(DisplayName = "Contact")]
		[PXSelector(typeof(Contact.contactID),
			DescriptionField = typeof(Contact.displayName),
			SelectorMode = PXSelectorMode.DisplayModeText,
			DirtyRead = true)]
		public virtual int? ContactID { get; set; }
		#endregion

		#region SuggestedOpportunityID
		public abstract class suggestedOpportunityID : BqlString.Field<suggestedOpportunityID> { }

		[PXDBString(CROpportunity.OpportunityIDLength, IsUnicode = true, InputMask = ">CCCCCCCCCCCCCCC")]
		[PXUIField(DisplayName = "Suggested Opportunity", Visibility = PXUIVisibility.SelectorVisible)]
		[PXSelector(typeof(Search2<
				CROpportunity.opportunityID,
				LeftJoin<BAccount, On<BAccount.bAccountID, Equal<CROpportunity.bAccountID>>,
				LeftJoin<Contact, On<Contact.contactID, Equal<CROpportunity.contactID>>>>,
				Where2<
					Where<
						BAccount.bAccountID, IsNull,
						Or<Match<BAccount, Current<AccessInfo.userName>>>>,
					And<
						CROpportunity.status, NotEqual<LSOpportunityMeetingNotesApprovalOpportunityStatus.lost>,
						And<CROpportunity.status, NotEqual<LSOpportunityMeetingNotesApprovalOpportunityStatus.won>>>>,
				OrderBy<Desc<CROpportunity.opportunityID>>>),
			new[]
			{
				typeof(CROpportunity.opportunityID),
				typeof(CROpportunity.subject),
				typeof(CROpportunity.status),
				typeof(CROpportunity.curyAmount),
				typeof(CROpportunity.curyID),
				typeof(CROpportunity.closeDate),
				typeof(CROpportunity.stageID),
				typeof(CROpportunity.classID),
				typeof(CROpportunity.isActive),
				typeof(BAccount.acctName),
				typeof(Contact.displayName),
			},
			Filterable = true,
			DescriptionField = typeof(CROpportunity.subject))]
		public virtual string SuggestedOpportunityID { get; set; }
		#endregion

		#region SuggestedOpportunitySubject
		public abstract class suggestedOpportunitySubject : BqlString.Field<suggestedOpportunitySubject> { }

		[PXString(255, IsUnicode = true)]
		[PXFormula(typeof(Selector<LSOpportunityMeetingNotesApproval.suggestedOpportunityID, CROpportunity.subject>))]
		[PXUIField(DisplayName = "Suggested Opportunity Name", Enabled = false)]
		public virtual string SuggestedOpportunitySubject { get; set; }
		#endregion

		#region ConfirmedOpportunityID
		public abstract class confirmedOpportunityID : BqlString.Field<confirmedOpportunityID> { }

		[PXDBString(CROpportunity.OpportunityIDLength, IsUnicode = true, InputMask = ">CCCCCCCCCCCCCCC")]
		[PXUIField(DisplayName = "Confirmed Opportunity", Visibility = PXUIVisibility.SelectorVisible)]
		[PXSelector(typeof(Search2<
				CROpportunity.opportunityID,
				LeftJoin<BAccount, On<BAccount.bAccountID, Equal<CROpportunity.bAccountID>>,
				LeftJoin<Contact, On<Contact.contactID, Equal<CROpportunity.contactID>>>>,
				Where2<
					Where<
						BAccount.bAccountID, IsNull,
						Or<Match<BAccount, Current<AccessInfo.userName>>>>,
					And<
						CROpportunity.status, NotEqual<LSOpportunityMeetingNotesApprovalOpportunityStatus.lost>,
						And<CROpportunity.status, NotEqual<LSOpportunityMeetingNotesApprovalOpportunityStatus.won>>>>,
				OrderBy<Desc<CROpportunity.opportunityID>>>),
			new[]
			{
				typeof(CROpportunity.opportunityID),
				typeof(CROpportunity.subject),
				typeof(CROpportunity.status),
				typeof(CROpportunity.curyAmount),
				typeof(CROpportunity.curyID),
				typeof(CROpportunity.closeDate),
				typeof(CROpportunity.stageID),
				typeof(CROpportunity.classID),
				typeof(CROpportunity.isActive),
				typeof(BAccount.acctName),
				typeof(Contact.displayName),
			},
			Filterable = true,
			DescriptionField = typeof(CROpportunity.subject))]
		public virtual string ConfirmedOpportunityID { get; set; }
		#endregion

		#region ConfirmedOpportunitySubject
		public abstract class confirmedOpportunitySubject : BqlString.Field<confirmedOpportunitySubject> { }

		[PXString(255, IsUnicode = true)]
		[PXFormula(typeof(Selector<LSOpportunityMeetingNotesApproval.confirmedOpportunityID, CROpportunity.subject>))]
		[PXUIField(DisplayName = "Confirmed Opportunity Name", Enabled = false)]
		public virtual string ConfirmedOpportunitySubject { get; set; }
		#endregion

		#region MatchDiagnostics
		public abstract class matchDiagnostics : BqlString.Field<matchDiagnostics> { }

		[PXDBText(IsUnicode = true)]
		[PXUIField(DisplayName = "Match Diagnostics")]
		public virtual string MatchDiagnostics { get; set; }
		#endregion

		#region ErrorMessage
		public abstract class errorMessage : BqlString.Field<errorMessage> { }

		[PXDBText(IsUnicode = true)]
		[PXUIField(DisplayName = "Error Message")]
		public virtual string ErrorMessage { get; set; }
		#endregion

		#region ActivityNoteID
		public abstract class activityNoteID : BqlGuid.Field<activityNoteID> { }

		[PXDBGuid]
		[PXUIField(DisplayName = "Activity Note ID", Enabled = false)]
		public virtual Guid? ActivityNoteID { get; set; }
		#endregion

		#region ApprovedByID
		public abstract class approvedByID : BqlGuid.Field<approvedByID> { }

		[PXDBGuid]
		[PXUIField(DisplayName = "Approved By", Enabled = false)]
		public virtual Guid? ApprovedByID { get; set; }
		#endregion

		#region ApprovedDateTime
		public abstract class approvedDateTime : BqlDateTime.Field<approvedDateTime> { }

		[PXDBDateAndTime(PreserveTime = true)]
		[PXUIField(DisplayName = "Approved Date", Enabled = false)]
		public virtual DateTime? ApprovedDateTime { get; set; }
		#endregion

		#region PostApprovalSyncStatus
		public abstract class postApprovalSyncStatus : BqlString.Field<postApprovalSyncStatus> { }

		[PXDBString(1, IsFixed = true)]
		[PXDefault(LSOpportunityMeetingNotesApprovalSyncStatus.NotReady)]
		[LSOpportunityMeetingNotesApprovalSyncStatus.List]
		[PXUIField(DisplayName = "Post-Approval Sync Status")]
		public virtual string PostApprovalSyncStatus { get; set; }
		#endregion

		#region PostApprovalSyncDateTime
		public abstract class postApprovalSyncDateTime : BqlDateTime.Field<postApprovalSyncDateTime> { }

		[PXDBDateAndTime(PreserveTime = true)]
		[PXUIField(DisplayName = "Post-Approval Sync Date", Enabled = false)]
		public virtual DateTime? PostApprovalSyncDateTime { get; set; }
		#endregion

		#region PostApprovalSyncError
		public abstract class postApprovalSyncError : BqlString.Field<postApprovalSyncError> { }

		[PXDBText(IsUnicode = true)]
		[PXUIField(DisplayName = "Post-Approval Sync Error")]
		public virtual string PostApprovalSyncError { get; set; }
		#endregion

		#region Processed
		public abstract class processed : BqlBool.Field<processed> { }

		[PXDBBool]
		[PXDefault(false)]
		[PXUIField(DisplayName = "Post-Approval Processed", Enabled = false)]
		public virtual bool? Processed { get; set; }
		#endregion

		#region NoteID
		public abstract class noteID : BqlGuid.Field<noteID> { }

		[PXNote(DescriptionField = typeof(meetingTitle))]
		public virtual Guid? NoteID { get; set; }
		#endregion

		#region CreatedByID
		public abstract class createdByID : BqlGuid.Field<createdByID> { }

		[PXDBCreatedByID]
		public virtual Guid? CreatedByID { get; set; }
		#endregion

		#region CreatedByScreenID
		public abstract class createdByScreenID : BqlString.Field<createdByScreenID> { }

		[PXDBCreatedByScreenID]
		public virtual string CreatedByScreenID { get; set; }
		#endregion

		#region CreatedDateTime
		public abstract class createdDateTime : BqlDateTime.Field<createdDateTime> { }

		[PXDBCreatedDateTime]
		public virtual DateTime? CreatedDateTime { get; set; }
		#endregion

		#region LastModifiedByID
		public abstract class lastModifiedByID : BqlGuid.Field<lastModifiedByID> { }

		[PXDBLastModifiedByID]
		public virtual Guid? LastModifiedByID { get; set; }
		#endregion

		#region LastModifiedByScreenID
		public abstract class lastModifiedByScreenID : BqlString.Field<lastModifiedByScreenID> { }

		[PXDBLastModifiedByScreenID]
		public virtual string LastModifiedByScreenID { get; set; }
		#endregion

		#region LastModifiedDateTime
		public abstract class lastModifiedDateTime : BqlDateTime.Field<lastModifiedDateTime> { }

		[PXDBLastModifiedDateTime]
		public virtual DateTime? LastModifiedDateTime { get; set; }
		#endregion

		#region TStamp
		public abstract class tStamp : BqlByteArray.Field<tStamp> { }

		[PXDBTimestamp]
		public virtual byte[] TStamp { get; set; }
		#endregion
	}

	public static class LSOpportunityMeetingNotesApprovalStatus
	{
		public const string Pending = "P";
		public const string Approved = "A";
		public const string Rejected = "R";
		public const string Error = "E";

		public class pending : BqlString.Constant<pending>
		{
			public pending() : base(Pending) { }
		}

		public class approved : BqlString.Constant<approved>
		{
			public approved() : base(Approved) { }
		}

		public class rejected : BqlString.Constant<rejected>
		{
			public rejected() : base(Rejected) { }
		}

		public class error : BqlString.Constant<error>
		{
			public error() : base(Error) { }
		}

		public class ListAttribute : PXStringListAttribute
		{
			public ListAttribute()
				: base(
					new[] { Pending, Approved, Rejected, Error },
					new[] { "Pending", "Approved", "Rejected", "Error" })
			{
			}
		}
	}

	public static class LSOpportunityMeetingNotesApprovalSyncStatus
	{
		public const string NotReady = "N";
		public const string Pending = "P";
		public const string Synced = "S";
		public const string Error = "E";

		public class notReady : BqlString.Constant<notReady>
		{
			public notReady() : base(NotReady) { }
		}

		public class pending : BqlString.Constant<pending>
		{
			public pending() : base(Pending) { }
		}

		public class synced : BqlString.Constant<synced>
		{
			public synced() : base(Synced) { }
		}

		public class error : BqlString.Constant<error>
		{
			public error() : base(Error) { }
		}

		public class ListAttribute : PXStringListAttribute
		{
			public ListAttribute()
				: base(
					new[] { NotReady, Pending, Synced, Error },
					new[] { "Not Ready", "Pending", "Synced", "Error" })
			{
			}
		}
	}
}
