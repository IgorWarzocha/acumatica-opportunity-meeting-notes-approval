import "client-controls/controls/utility/options/qp-options";

import {
	createCollection,
	graphInfo,
	linkCommand,
	columnConfig,
	gridConfig,
	GridFilterBarVisibility,
	GridPreset,
	PXFieldOptions,
	PXFieldState,
	PXPageLoadBehavior,
	PXScreen,
	PXView,
	viewInfo,
	PXActionState,
} from "client-controls";

@graphInfo({
	graphType: "LS.OpportunityMeetingNotesApproval.Graph.LSOpportunityMeetingNotesApprovalProcess",
	primaryView: "Records",
	pageLoadBehavior: PXPageLoadBehavior.PopulateSavedValues,
})
export class LS501000 extends PXScreen {
	ViewDocument: PXActionState;
	ViewOpportunity: PXActionState;
	ViewSuggestedOpportunity: PXActionState;
	ViewActivity: PXActionState;
	Reject: PXActionState;

	@viewInfo({ containerName: "Pending Meeting Notes" })
	Records = createCollection(LSOpportunityMeetingNotesApproval);
}

@gridConfig({
	preset: GridPreset.Processing,
	showFilterBar: GridFilterBarVisibility.OnDemand,
	adjustPageSize: true,
	batchUpdate: true,
	allowUpdate: false,
})
export class LSOpportunityMeetingNotesApproval extends PXView {
	@columnConfig({ allowCheckAll: true, width: 35 })
	Selected: PXFieldState<PXFieldOptions.CommitChanges>;
	Status: PXFieldState;

	@linkCommand("ViewDocument")
	ApprovalID: PXFieldState;
	MeetingDate: PXFieldState;

	@linkCommand("ViewDocument")
	MeetingTitle: PXFieldState;

	@linkCommand("ViewSuggestedOpportunity")
	SuggestedOpportunityID: PXFieldState;
	@columnConfig({ hideViewLink: true })
	SuggestedOpportunitySubject: PXFieldState;

	@linkCommand("ViewOpportunity")
	ConfirmedOpportunityID: PXFieldState<PXFieldOptions.CommitChanges>;
	@columnConfig({ hideViewLink: true })
	ConfirmedOpportunitySubject: PXFieldState;
	OrganizerEmail: PXFieldState;
	TranscriptUrl: PXFieldState;

	@linkCommand("ViewActivity")
	ActivityNoteID: PXFieldState;
	ApprovedDateTime: PXFieldState;
	ErrorMessage: PXFieldState;
	CreatedDateTime: PXFieldState;
}
