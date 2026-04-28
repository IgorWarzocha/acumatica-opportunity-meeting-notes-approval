using System;
using PX.Data;
using PX.Data.BQL;
using PX.Objects.CR;
using LSOpportunityMeetingNotesApproval.Graph;

namespace LSOpportunityMeetingNotesApproval.DAC
{
	[Serializable]
	[PXCacheName("Opportunity Chat Session")]
	[PXPrimaryGraph(typeof(LSOpportunityChatMaint))]
	[PXTable]
	public class LSOpportunityChatSession : PXBqlTable, IBqlTable
	{
		public class PK
		{
			public static LSOpportunityChatSession Find(PXGraph graph, int? chatSessionID)
			{
				return PXSelect<LSOpportunityChatSession,
					Where<LSOpportunityChatSession.chatSessionID, Equal<Required<LSOpportunityChatSession.chatSessionID>>>>
					.SelectWindowed(graph, 0, 1, chatSessionID)
					.TopFirst;
			}
		}

		#region ChatSessionID
		public abstract class chatSessionID : BqlInt.Field<chatSessionID> { }
		[PXDBIdentity(IsKey = true)]
		[PXUIField(DisplayName = "Chat Session ID", Enabled = false)]
		public virtual int? ChatSessionID { get; set; }
		#endregion

		#region OpportunityID
		public abstract class opportunityID : BqlString.Field<opportunityID> { }
		[PXDBString(CROpportunity.OpportunityIDLength, IsUnicode = true, InputMask = ">CCCCCCCCCCCCCCC")]
		[PXDefault]
		[PXUIField(DisplayName = "Opportunity ID", Enabled = false)]
		[PXSelector(typeof(Search<CROpportunity.opportunityID>), DescriptionField = typeof(CROpportunity.subject))]
		public virtual string OpportunityID { get; set; }
		#endregion

		#region Subject
		public abstract class subject : BqlString.Field<subject> { }
		[PXDBString(255, IsUnicode = true)]
		[PXUIField(DisplayName = "Opportunity Subject", Enabled = false)]
		public virtual string Subject { get; set; }
		#endregion

		#region LastMessageDateTime
		public abstract class lastMessageDateTime : BqlDateTime.Field<lastMessageDateTime> { }
		[PXDBDateAndTime(PreserveTime = true)]
		[PXUIField(DisplayName = "Last Message", Enabled = false)]
		public virtual DateTime? LastMessageDateTime { get; set; }
		#endregion

		#region NoteID
		public abstract class noteID : BqlGuid.Field<noteID> { }
		[PXNote(DescriptionField = typeof(subject))]
		public virtual Guid? NoteID { get; set; }
		#endregion

		#region Audit Fields
		public abstract class createdByID : BqlGuid.Field<createdByID> { }
		[PXDBCreatedByID]
		public virtual Guid? CreatedByID { get; set; }
		public abstract class createdByScreenID : BqlString.Field<createdByScreenID> { }
		[PXDBCreatedByScreenID]
		public virtual string CreatedByScreenID { get; set; }
		public abstract class createdDateTime : BqlDateTime.Field<createdDateTime> { }
		[PXDBCreatedDateTime]
		public virtual DateTime? CreatedDateTime { get; set; }
		public abstract class lastModifiedByID : BqlGuid.Field<lastModifiedByID> { }
		[PXDBLastModifiedByID]
		public virtual Guid? LastModifiedByID { get; set; }
		public abstract class lastModifiedByScreenID : BqlString.Field<lastModifiedByScreenID> { }
		[PXDBLastModifiedByScreenID]
		public virtual string LastModifiedByScreenID { get; set; }
		public abstract class lastModifiedDateTime : BqlDateTime.Field<lastModifiedDateTime> { }
		[PXDBLastModifiedDateTime]
		public virtual DateTime? LastModifiedDateTime { get; set; }
		public abstract class tStamp : BqlByteArray.Field<tStamp> { }
		[PXDBTimestamp]
		public virtual byte[] TStamp { get; set; }
		#endregion
	}
}
