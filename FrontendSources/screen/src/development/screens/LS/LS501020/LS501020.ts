import {
	columnConfig,
	controlConfig,
	createCollection,
	createSingle,
	graphInfo,
	gridConfig,
	GridPreset,
	PXActionState,
	PXFieldOptions,
	PXFieldState,
	PXPageLoadBehavior,
	PXScreen,
	PXView,
	TextAlign,
	viewInfo,
} from "client-controls";

@graphInfo({
	graphType: "LSOpportunityMeetingNotesApproval.LSOpportunityChatMaint",
	primaryView: "Document",
	pageLoadBehavior: PXPageLoadBehavior.PopulateSavedValues,
})
export class LS501020 extends PXScreen {
	Send: PXActionState;

	@viewInfo({ containerName: "Opportunity Chat" })
	Document = createSingle(LSOpportunityChatSession);

	@viewInfo({ containerName: "Prompt" })
	Prompt = createSingle(LSOpportunityChatPrompt);

	@viewInfo({ containerName: "Context" })
	Context = createSingle(LSOpportunityChatContext);

	@viewInfo({ containerName: "Messages" })
	ChatMessages = createCollection(LSOpportunityChatMessage);
}

export class LSOpportunityChatSession extends PXView {
	ChatSessionID: PXFieldState<PXFieldOptions.Disabled>;
	OpportunityID: PXFieldState<PXFieldOptions.Disabled>;
	Subject: PXFieldState<PXFieldOptions.Disabled>;
	LastMessageDateTime: PXFieldState<PXFieldOptions.Disabled>;
}

export class LSOpportunityChatPrompt extends PXView {
	OpportunityID: PXFieldState<PXFieldOptions.Disabled>;
	@controlConfig({ rows: 4 })
	MessageText: PXFieldState<PXFieldOptions.Multiline | PXFieldOptions.CommitChanges>;
}

export class LSOpportunityChatContext extends PXView {
	OpportunityID: PXFieldState<PXFieldOptions.Disabled>;
	Subject: PXFieldState<PXFieldOptions.Disabled>;
	Status: PXFieldState<PXFieldOptions.Disabled>;
	StageID: PXFieldState<PXFieldOptions.Disabled>;
	ClassID: PXFieldState<PXFieldOptions.Disabled>;
	OpportunityAddressID: PXFieldState<PXFieldOptions.Disabled>;
	OpportunityContactID: PXFieldState<PXFieldOptions.Disabled>;
	ShipAddressID: PXFieldState<PXFieldOptions.Disabled>;
	ShipContactID: PXFieldState<PXFieldOptions.Disabled>;
	BillAddressID: PXFieldState<PXFieldOptions.Disabled>;
	BillContactID: PXFieldState<PXFieldOptions.Disabled>;
	ContactID: PXFieldState<PXFieldOptions.Disabled>;
	BAccountID: PXFieldState<PXFieldOptions.Disabled>;
	ParentBAccountID: PXFieldState<PXFieldOptions.Disabled>;
	LocationID: PXFieldState<PXFieldOptions.Disabled>;
	TaxZoneID: PXFieldState<PXFieldOptions.Disabled>;
	CuryID: PXFieldState<PXFieldOptions.Disabled>;
	CuryInfoID: PXFieldState<PXFieldOptions.Disabled>;
	OwnerID: PXFieldState<PXFieldOptions.Disabled>;
	WorkgroupID: PXFieldState<PXFieldOptions.Disabled>;
	SalesTerritoryID: PXFieldState<PXFieldOptions.Disabled>;
}

@gridConfig({
	preset: GridPreset.Inquiry,
	allowInsert: false,
	allowUpdate: false,
	allowDelete: false,
	adjustPageSize: true,
})
export class LSOpportunityChatMessage extends PXView {
	@columnConfig({ textAlign: TextAlign.Right, width: 160 })
	MessageDateTime: PXFieldState<PXFieldOptions.Disabled>;
	@columnConfig({ width: 100 })
	Role: PXFieldState<PXFieldOptions.Disabled>;
	MessageText: PXFieldState<PXFieldOptions.Multiline | PXFieldOptions.Disabled>;
}
