export type ResolutionRecord = {
    id: string;
    case_id: string;
    docket_number: string;
    verdict: 'For Filing' | 'Dismissed' | 'Pending';
    court: string | null;
    verdict_date: string;
    status: 'Pending' | 'Approved' | 'Denied';
    revision_number: number;
    created_by: string | null;
    submitted_by: string | null;
    report_eligible: boolean;
};

export type ResolutionRevision = {
    revision_number: number;
    verdict: 'For Filing' | 'Dismissed';
    court: string | null;
    verdict_date: string;
    submitted_by: string | null;
    submitted_at: string | null;
};

export type ResolutionDecision = {
    revision_number: number;
    decision: 'Approved' | 'Denied';
    comment: string | null;
    decided_by: string | null;
    decided_at: string | null;
};
