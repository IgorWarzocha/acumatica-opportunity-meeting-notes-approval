import {
	createSingle,
	graphInfo,
	linkCommand,
	PXActionState,
	PXFieldOptions,
	PXFieldState,
	PXPageLoadBehavior,
	PXScreen,
	PXView,
	controlConfig,
} from "client-controls";

@graphInfo({
	graphType: "PX.Objects.LS.LSOpportunityMeetingNotesApprovalEntry",
	primaryView: "Document",
	pageLoadBehavior: PXPageLoadBehavior.PopulateSavedValues,
})
export class LS501010 extends PXScreen {
	Approve: PXActionState;
	Reject: PXActionState;
	ViewSuggestedOpportunity: PXActionState;
	ViewConfirmedOpportunity: PXActionState;

	Document = createSingle(LSOpportunityMeetingNotesApprovalDocument);
}

export class LSOpportunityMeetingNotesApprovalDocument extends PXView {
	ApprovalID: PXFieldState<PXFieldOptions.Disabled>;
	ExternalMeetingID: PXFieldState;
	ExternalClientReferenceID: PXFieldState;
	Status: PXFieldState;
	MeetingDate: PXFieldState<PXFieldOptions.CommitChanges>;
	MeetingTitle: PXFieldState<PXFieldOptions.CommitChanges>;
	Subject: PXFieldState<PXFieldOptions.CommitChanges>;
	BusinessAccountID: PXFieldState<PXFieldOptions.CommitChanges>;
	ContactID: PXFieldState<PXFieldOptions.CommitChanges>;

	@linkCommand("ViewSuggestedOpportunity")
	@controlConfig({ allowEdit: true })
	SuggestedOpportunityID: PXFieldState<PXFieldOptions.CommitChanges>;
	SuggestedOpportunitySubject: PXFieldState<PXFieldOptions.Disabled>;

	@linkCommand("ViewConfirmedOpportunity")
	@controlConfig({ allowEdit: true })
	ConfirmedOpportunityID: PXFieldState<PXFieldOptions.CommitChanges>;
	ConfirmedOpportunitySubject: PXFieldState<PXFieldOptions.Disabled>;

	OrganizerEmail: PXFieldState;
	TranscriptUrl: PXFieldState;
	ActivityNoteID: PXFieldState<PXFieldOptions.Disabled>;
	ApprovedDateTime: PXFieldState<PXFieldOptions.Disabled>;
	PostApprovalSyncStatus: PXFieldState;
	PostApprovalSyncDateTime: PXFieldState<PXFieldOptions.Disabled>;
	Processed: PXFieldState;
	CreatedDateTime: PXFieldState<PXFieldOptions.Disabled>;
	ParticipantEmails: PXFieldState;
	MeetingSummary: PXFieldState;
	TranscriptHtml: PXFieldState;
	MatchDiagnostics: PXFieldState;
	ErrorMessage: PXFieldState;
	PostApprovalSyncError: PXFieldState;
}
