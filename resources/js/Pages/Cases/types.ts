export type OffenseOption = {
    id: string;
    name: string;
    law_reference: string | null;
    is_selectable: boolean;
};

export type ProsecutorOption = {
    id: string;
    label: string;
};

export type AddressOption = {
    code: string;
    name: string;
};

export type CasePartyForm = {
    source_party_id?: string | null;
    role: 'Complainant' | 'Respondent';
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    date_of_birth: string;
    sex: 'Male' | 'Female';
    street: string;
    barangay: string;
    municipality: string;
    province: string;
    region: string;
    region_code: string;
    province_code: string;
    municipality_code: string;
    barangay_code: string;
};

export type CaseRecord = {
    id: string;
    docket_number: string;
    date: string;
    hearing_date_1: string | null;
    hearing_date_2: string | null;
    police_station: string;
    subpoena_status: 'Pending' | 'Approved' | 'Denied';
    revision_number: number;
    assigned_prosecutor_name: string | null;
    created_by_name?: string | null;
    offense_ids?: string[];
    offenses: string[];
    complainants: string[];
    respondents: string[];
    resolution_verdict: 'For Filing' | 'Dismissed' | 'Pending';
    court: string | null;
    verdict_date: string | null;
    command_status?: 'Resolved' | 'Resolving...' | 'Due for Hearing' | null;
    can_submit_resolution?: boolean;
    can_generate_subpoena?: boolean;
    parties?: CasePartyForm[];
};
