import {
	controlConfig,
	createSingle,
	graphInfo,
	IDatetimeEditControlConfig,
	ISelectorControlConfig,
	linkCommand,
	PXActionState,
	PXFieldOptions,
	PXFieldState,
	PXPageLoadBehavior,
	PXScreen,
	PXView,
	viewInfo,
} from "client-controls";

@graphInfo({
	graphType: "LS.OpportunityMeetingNotesApproval.Graph.LSOpportunityMeetingNotesApprovalEntry",
	primaryView: "Document",
	pageLoadBehavior: PXPageLoadBehavior.PopulateSavedValues,
})
export class LS501010 extends PXScreen {
	Approve: PXActionState;
	Reject: PXActionState;
	ViewSuggestedOpportunity: PXActionState;
	ViewConfirmedOpportunity: PXActionState;

	@viewInfo({ containerName: "Meeting Notes Approval" })
	Document = createSingle(LSOpportunityMeetingNotesApprovalDocument);
}

export class LSOpportunityMeetingNotesApprovalDocument extends PXView {
	ApprovalID: PXFieldState<PXFieldOptions.Disabled>;
	ExternalMeetingID: PXFieldState;
	ExternalClientReferenceID: PXFieldState;
	Status: PXFieldState;
	@controlConfig<IDatetimeEditControlConfig>({ preserveTimezone: true })
	MeetingDate: PXFieldState<PXFieldOptions.CommitChanges>;
	MeetingTitle: PXFieldState<PXFieldOptions.CommitChanges>;

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
	@controlConfig<IDatetimeEditControlConfig>({ preserveTimezone: true })
	ApprovedDateTime: PXFieldState<PXFieldOptions.Disabled>;
	@controlConfig<IDatetimeEditControlConfig>({ preserveTimezone: true })
	CreatedDateTime: PXFieldState<PXFieldOptions.Disabled>;
	ParticipantEmails: PXFieldState<PXFieldOptions.Multiline>;
	MeetingSummary: PXFieldState<PXFieldOptions.Multiline>;
	TranscriptHtml: PXFieldState<PXFieldOptions.Multiline>;
	MatchDiagnostics: PXFieldState<PXFieldOptions.Multiline>;
	ErrorMessage: PXFieldState<PXFieldOptions.Multiline | PXFieldOptions.Disabled>;
}
