using System;
using PX.Data;
using PX.Data.BQL;
using PX.Objects.CR;

namespace LSOpportunityMeetingNotesApproval
{
	[Serializable]
	[PXCacheName("Opportunity Chat Context")]
	public class LSOpportunityChatContext : PXBqlTable, IBqlTable
	{
		#region OpportunityID
		public abstract class opportunityID : BqlString.Field<opportunityID> { }
		[PXString(CROpportunity.OpportunityIDLength, IsUnicode = true)]
		[PXUIField(DisplayName = "Opportunity ID", Enabled = false)]
		public virtual string OpportunityID { get; set; }
		#endregion

		#region Subject
		public abstract class subject : BqlString.Field<subject> { }
		[PXString(255, IsUnicode = true)]
		[PXUIField(DisplayName = "Subject", Enabled = false)]
		public virtual string Subject { get; set; }
		#endregion

		#region Status
		public abstract class status : BqlString.Field<status> { }
		[PXString(2)]
		[PXUIField(DisplayName = "Status", Enabled = false)]
		public virtual string Status { get; set; }
		#endregion

		#region StageID
		public abstract class stageID : BqlString.Field<stageID> { }
		[PXString(2)]
		[PXUIField(DisplayName = "Stage", Enabled = false)]
		public virtual string StageID { get; set; }
		#endregion

		#region FK fields
		public abstract class classID : BqlString.Field<classID> { }
		[PXString(10, IsUnicode = true)]
		[PXUIField(DisplayName = "Class ID", Enabled = false)]
		public virtual string ClassID { get; set; }

		public abstract class opportunityAddressID : BqlInt.Field<opportunityAddressID> { }
		[PXInt]
		[PXUIField(DisplayName = "Opportunity Address ID", Enabled = false)]
		public virtual int? OpportunityAddressID { get; set; }

		public abstract class opportunityContactID : BqlInt.Field<opportunityContactID> { }
		[PXInt]
		[PXUIField(DisplayName = "Opportunity Contact ID", Enabled = false)]
		public virtual int? OpportunityContactID { get; set; }

		public abstract class shipAddressID : BqlInt.Field<shipAddressID> { }
		[PXInt]
		[PXUIField(DisplayName = "Ship Address ID", Enabled = false)]
		public virtual int? ShipAddressID { get; set; }

		public abstract class shipContactID : BqlInt.Field<shipContactID> { }
		[PXInt]
		[PXUIField(DisplayName = "Ship Contact ID", Enabled = false)]
		public virtual int? ShipContactID { get; set; }

		public abstract class billAddressID : BqlInt.Field<billAddressID> { }
		[PXInt]
		[PXUIField(DisplayName = "Bill Address ID", Enabled = false)]
		public virtual int? BillAddressID { get; set; }

		public abstract class billContactID : BqlInt.Field<billContactID> { }
		[PXInt]
		[PXUIField(DisplayName = "Bill Contact ID", Enabled = false)]
		public virtual int? BillContactID { get; set; }

		public abstract class contactID : BqlInt.Field<contactID> { }
		[PXInt]
		[PXUIField(DisplayName = "Contact ID", Enabled = false)]
		public virtual int? ContactID { get; set; }

		public abstract class bAccountID : BqlInt.Field<bAccountID> { }
		[PXInt]
		[PXUIField(DisplayName = "Business Account ID", Enabled = false)]
		public virtual int? BAccountID { get; set; }

		public abstract class parentBAccountID : BqlInt.Field<parentBAccountID> { }
		[PXInt]
		[PXUIField(DisplayName = "Parent Business Account ID", Enabled = false)]
		public virtual int? ParentBAccountID { get; set; }

		public abstract class locationID : BqlInt.Field<locationID> { }
		[PXInt]
		[PXUIField(DisplayName = "Location ID", Enabled = false)]
		public virtual int? LocationID { get; set; }

		public abstract class taxZoneID : BqlString.Field<taxZoneID> { }
		[PXString(10, IsUnicode = true)]
		[PXUIField(DisplayName = "Tax Zone ID", Enabled = false)]
		public virtual string TaxZoneID { get; set; }

		public abstract class curyID : BqlString.Field<curyID> { }
		[PXString(5, IsUnicode = true)]
		[PXUIField(DisplayName = "Currency ID", Enabled = false)]
		public virtual string CuryID { get; set; }

		public abstract class curyInfoID : BqlLong.Field<curyInfoID> { }
		[PXLong]
		[PXUIField(DisplayName = "Currency Info ID", Enabled = false)]
		public virtual long? CuryInfoID { get; set; }

		public abstract class ownerID : BqlInt.Field<ownerID> { }
		[PXInt]
		[PXUIField(DisplayName = "Owner ID", Enabled = false)]
		public virtual int? OwnerID { get; set; }

		public abstract class workgroupID : BqlInt.Field<workgroupID> { }
		[PXInt]
		[PXUIField(DisplayName = "Workgroup ID", Enabled = false)]
		public virtual int? WorkgroupID { get; set; }

		public abstract class salesTerritoryID : BqlString.Field<salesTerritoryID> { }
		[PXString(10, IsUnicode = true)]
		[PXUIField(DisplayName = "Sales Territory ID", Enabled = false)]
		public virtual string SalesTerritoryID { get; set; }
		#endregion
	}
}
