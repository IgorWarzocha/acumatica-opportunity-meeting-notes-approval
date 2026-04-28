using System;
using PX.Data;
using PX.Data.BQL;

namespace LSOpportunityMeetingNotesApproval.DAC
{
	[Serializable]
	[PXCacheName("Opportunity Chat Message")]
	[PXTable]
	public class LSOpportunityChatMessage : PXBqlTable, IBqlTable
	{
		#region ChatMessageID
		public abstract class chatMessageID : BqlInt.Field<chatMessageID> { }
		[PXDBIdentity(IsKey = true)]
		[PXUIField(DisplayName = "Chat Message ID", Enabled = false)]
		public virtual int? ChatMessageID { get; set; }
		#endregion

		#region ChatSessionID
		public abstract class chatSessionID : BqlInt.Field<chatSessionID> { }
		[PXDBInt]
		[PXDBDefault(typeof(LSOpportunityChatSession.chatSessionID))]
		[PXParent(typeof(Select<LSOpportunityChatSession,
			Where<LSOpportunityChatSession.chatSessionID, Equal<Current<LSOpportunityChatMessage.chatSessionID>>>>))]
		[PXUIField(DisplayName = "Chat Session ID", Enabled = false)]
		public virtual int? ChatSessionID { get; set; }
		#endregion

		#region MessageDateTime
		public abstract class messageDateTime : BqlDateTime.Field<messageDateTime> { }
		[PXDBDateAndTime(PreserveTime = true)]
		[PXDefault(typeof(AccessInfo.businessDate))]
		[PXUIField(DisplayName = "Date", Enabled = false)]
		public virtual DateTime? MessageDateTime { get; set; }
		#endregion

		#region Role
		public abstract class role : BqlString.Field<role> { }
		[PXDBString(1, IsFixed = true)]
		[PXDefault(LSOpportunityChatMessageRole.User)]
		[LSOpportunityChatMessageRole.List]
		[PXUIField(DisplayName = "Role", Enabled = false)]
		public virtual string Role { get; set; }
		#endregion

		#region MessageText
		public abstract class messageText : BqlString.Field<messageText> { }
		[PXDBText(IsUnicode = true)]
		[PXUIField(DisplayName = "Message")]
		public virtual string MessageText { get; set; }
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

	public static class LSOpportunityChatMessageRole
	{
		public const string User = "U";
		public const string Assistant = "A";
		public const string System = "S";

		public class user : BqlString.Constant<user> { public user() : base(User) { } }
		public class assistant : BqlString.Constant<assistant> { public assistant() : base(Assistant) { } }
		public class system : BqlString.Constant<system> { public system() : base(System) { } }

		public class ListAttribute : PXStringListAttribute
		{
			public ListAttribute() : base(new[] { User, Assistant, System }, new[] { "User", "Assistant", "System" }) { }
		}
	}
}
