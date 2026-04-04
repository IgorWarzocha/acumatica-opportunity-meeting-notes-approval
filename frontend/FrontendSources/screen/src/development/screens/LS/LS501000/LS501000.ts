import "client-controls/controls/simple/calendar/qp-calendar.html";
import "client-controls/controls/simple/button/qp-button.html";
import "client-controls/controls/simple/text-editor/qp-text-editor.html";
import "client-controls/controls/simple/longrun-indicator/qp-longrun-indicator.html";
import "client-controls/controls/dialog/long-run/qp-long-run.html";
import "client-controls/controls/dialog/quick-processing/qp-quick-processing.html";
import "client-controls/controls/compound/grid/qp-grid.html";
import "client-controls/controls/utility/options/qp-options";
import { PLATFORM } from "aurelia-pal";

// Force webpack to register the client-controls calendar template by its runtime module id.
// Without this explicit import, Aurelia bootstrapping for the modern screen crashes on qp-calendar view resolution.
// The bundled module key is source-relative, but Aurelia asks for the package-relative id at runtime.
// Patch the loader for this exact id so the screen can boot cleanly until the upstream packaging is fixed.

const QP_CALENDAR_TEMPLATE_ID = "client-controls/controls/simple/calendar/qp-calendar.html";
const QP_CALENDAR_TEMPLATE_BUNDLE_ID = "./src/client-controls/controls/simple/calendar/qp-calendar.html";

const loader = PLATFORM.Loader as { loadModule?: (moduleId: string, defaultHMR?: boolean) => Promise<unknown>; __lsPatchedQpCalendar?: boolean };

if (loader?.loadModule && !loader.__lsPatchedQpCalendar) {
	const originalLoadModule = loader.loadModule.bind(loader);
	loader.loadModule = (moduleId: string, defaultHMR?: boolean) => {
		if (moduleId === QP_CALENDAR_TEMPLATE_ID) {
			return originalLoadModule(QP_CALENDAR_TEMPLATE_BUNDLE_ID, defaultHMR);
		}

		return originalLoadModule(moduleId, defaultHMR);
	};
	loader.__lsPatchedQpCalendar = true;
}

import {
	createCollection,
	graphInfo,
	linkCommand,
	columnConfig,
	gridConfig,
	PXFieldOptions,
	PXFieldState,
	PXPageLoadBehavior,
	PXScreen,
	PXView,
	viewInfo,
	PXActionState,
} from "client-controls";

@graphInfo({
	graphType: "PX.Objects.LS.LSOpportunityMeetingNotesApprovalProcess",
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
	adjustPageSize: true,
	batchUpdate: true,
})
export class LSOpportunityMeetingNotesApproval extends PXView {
	Selected: PXFieldState<PXFieldOptions.CommitChanges>;
	Status: PXFieldState;

	@linkCommand("ViewDocument")
	ApprovalID: PXFieldState;
	MeetingDate: PXFieldState;

	@linkCommand("ViewDocument")
	MeetingTitle: PXFieldState;
	Subject: PXFieldState;
	BusinessAccountID: PXFieldState;
	ContactID: PXFieldState;

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
