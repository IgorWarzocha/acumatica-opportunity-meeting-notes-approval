import "client-controls/controls/simple/button/qp-button.html";
import "client-controls/controls/simple/text-editor/qp-text-editor.html";
import "client-controls/controls/simple/longrun-indicator/qp-longrun-indicator.html";
import "client-controls/controls/dialog/long-run/qp-long-run.html";
import "client-controls/controls/dialog/quick-processing/qp-quick-processing.html";
import "client-controls/controls/compound/grid/qp-grid.html";
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
	graphType: "LSOpportunityMeetingNotesApproval.LSOpportunityMeetingNotesApprovalProcess",
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
