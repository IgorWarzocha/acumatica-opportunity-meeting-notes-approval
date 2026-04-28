using System;
using PX.Data;
using PX.Data.BQL;

namespace LS.OpportunityMeetingNotesApproval.DAC
{
	[Serializable]
	[PXCacheName("Opportunity Chat Setup")]
	[PXTable]
	public class LSOpportunityChatSetup : PXBqlTable, IBqlTable
	{
		#region SetupID
		public abstract class setupID : BqlString.Field<setupID> { }

		[PXDBString(10, IsKey = true, IsUnicode = true)]
		[PXDefault("DEFAULT")]
		[PXUIField(DisplayName = "Setup ID", Enabled = false)]
		public virtual string SetupID { get; set; }
		#endregion

		#region N8nWebhookUrl
		public abstract class n8nWebhookUrl : BqlString.Field<n8nWebhookUrl> { }

		[PXDBString(2048, IsUnicode = true)]
		[PXUIField(DisplayName = "n8n Chat Webhook URL")]
		public virtual string N8nWebhookUrl { get; set; }
		#endregion

		#region N8nClientSecret
		public abstract class n8nClientSecret : BqlString.Field<n8nClientSecret> { }

		[PXDBString(255, IsUnicode = true)]
		[PXUIField(DisplayName = "n8n Client Secret")]
		public virtual string N8nClientSecret { get; set; }
		#endregion

		#region NoteID
		public abstract class noteID : BqlGuid.Field<noteID> { }

		[PXNote]
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
