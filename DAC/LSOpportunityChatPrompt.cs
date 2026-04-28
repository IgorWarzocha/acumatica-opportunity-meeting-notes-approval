using System;
using PX.Data;
using PX.Data.BQL;
using PX.Objects.CR;

namespace LS.OpportunityMeetingNotesApproval.DAC
{
	[Serializable]
	[PXCacheName("Opportunity Chat Prompt")]
	public class LSOpportunityChatPrompt : PXBqlTable, IBqlTable
	{
		#region OpportunityID
		public abstract class opportunityID : BqlString.Field<opportunityID> { }
		[PXString(CROpportunity.OpportunityIDLength, IsUnicode = true, InputMask = ">CCCCCCCCCCCCCCC")]
		[PXUIField(DisplayName = "Opportunity ID", Enabled = false)]
		public virtual string OpportunityID { get; set; }
		#endregion

		#region MessageText
		public abstract class messageText : BqlString.Field<messageText> { }
		[PXString(IsUnicode = true)]
		[PXUIField(DisplayName = "Message")]
		public virtual string MessageText { get; set; }
		#endregion
	}
}
