import {
	createSingle,
	graphInfo,
	PXFieldOptions,
	PXFieldState,
	PXPageLoadBehavior,
	PXScreen,
	PXView,
	viewInfo,
} from "client-controls";

@graphInfo({
	graphType: "LSOpportunityMeetingNotesApproval.LSOpportunityChatSetupMaint",
	primaryView: "Setup",
	pageLoadBehavior: PXPageLoadBehavior.PopulateSavedValues,
})
export class LS501030 extends PXScreen {
	@viewInfo({ containerName: "Opportunity Chat Setup" })
	Setup = createSingle(LSOpportunityChatSetup);
}

export class LSOpportunityChatSetup extends PXView {
	SetupID: PXFieldState<PXFieldOptions.Disabled>;
	N8nWebhookUrl: PXFieldState<PXFieldOptions.CommitChanges>;
	N8nClientSecret: PXFieldState<PXFieldOptions.CommitChanges>;
}
