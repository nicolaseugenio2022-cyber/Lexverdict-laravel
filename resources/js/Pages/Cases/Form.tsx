import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import FormField from '../../Components/FormField';
import OperationalTimestamp from '../../Components/OperationalTimestamp';
import PageHeader from '../../Components/PageHeader';
import { useToast } from '../../Components/toast';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import type { PageProps } from '../../types/page';
import CascadingAddressFields from './CascadingAddressFields';
import CrimeAutocomplete from './CrimeAutocomplete';
import type {
    AddressOption,
    CasePartyForm,
    CaseRecord,
    OffenseOption,
    ProsecutorOption,
} from './types';

type Props = {
    mode: 'create' | 'edit';
    caseRecord: CaseRecord | null;
    offenses: OffenseOption[];
    prosecutors: ProsecutorOption[];
    partyRoles: Array<'Complainant' | 'Respondent'>;
    can_select_prosecutor: boolean;
    regions: AddressOption[];
    police_stations: string[];
    denial_comments?: Array<{
        revision_number: number;
        comment: string;
        decided_by: string | null;
        decided_at: string | null;
    }>;
};

const blankParty = (role: 'Complainant' | 'Respondent'): CasePartyForm => ({
    source_party_id: null,
    role,
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    date_of_birth: '',
    sex: 'Male',
    street: '',
    barangay: '',
    municipality: '',
    province: '',
    region: '',
    region_code: '',
    province_code: '',
    municipality_code: '',
    barangay_code: '',
});

export default function Form({
    mode,
    caseRecord,
    offenses,
    prosecutors,
    partyRoles,
    can_select_prosecutor,
    regions,
    police_stations,
    denial_comments = [],
}: Props) {
    const toast = useToast();
    const { flash } = usePage<PageProps>().props;
    const { data, setData, post, patch, processing, errors, isDirty } = useForm({
        assigned_prosecutor_id: prosecutors[0]?.id ?? '',
        revision_number: caseRecord?.revision_number ?? 1,
        date: caseRecord?.date ?? new Date().toISOString().slice(0, 10),
        hearing_date_1: caseRecord?.hearing_date_1 ?? '',
        hearing_date_2: caseRecord?.hearing_date_2 ?? '',
        police_station: caseRecord?.police_station ?? '',
        offense_ids: caseRecord?.offense_ids ?? [],
        parties: caseRecord?.parties ?? [blankParty('Complainant'), blankParty('Respondent')],
    });
    const caseErrors = flash.errors.case ?? [];
    const offenseError =
        errors.offense_ids ??
        Object.entries(errors).find(([field]) => field.startsWith('offense_ids.'))?.[1];
    const { allowNextVisit } = useUnsavedChanges(isDirty && !processing);

    function submit(event: FormEvent) {
        event.preventDefault();
        if (processing) return;

        allowNextVisit();

        if (mode === 'edit' && caseRecord) {
            patch(`/cases/${caseRecord.id}`, {
                onSuccess: () => toast.success('Case updated.'),
            });
        } else {
            post('/cases', { onSuccess: () => toast.success('Case created.') });
        }
    }

    function setParty(index: number, field: keyof CasePartyForm, value: string) {
        const parties = [...data.parties];
        parties[index] = { ...parties[index], [field]: value };
        setData('parties', parties);
    }

    function replaceParty(index: number, party: CasePartyForm) {
        const parties = [...data.parties];
        parties[index] = party;
        setData('parties', parties);
    }

    function addParty(role: 'Complainant' | 'Respondent') {
        setData('parties', [...data.parties, blankParty(role)]);
    }

    function removeParty(index: number) {
        if (data.parties.length <= 2) {
            return;
        }
        setData(
            'parties',
            data.parties.filter((_, partyIndex) => partyIndex !== index),
        );
    }

    return (
        <AuthenticatedLayout>
            <Head
                title={
                    mode === 'create'
                        ? 'Create Case'
                        : `Revise ${caseRecord?.docket_number ?? 'Case'}`
                }
            />
            <div className="page-stack">
                <PageHeader
                    title={
                        mode === 'create' ? 'Create Case' : `Revise ${caseRecord?.docket_number}`
                    }
                    description="Docket number allocation remains server-controlled."
                    actions={
                        <Link
                            href={caseRecord ? `/cases/${caseRecord.id}` : '/cases'}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </Link>
                    }
                />
                <form onSubmit={submit} aria-busy={processing} className="grid gap-5">
                    <div className="surface surface-body">
                        {caseErrors.map((error) => (
                            <p key={error} className="notice notice-danger mt-4" role="alert">
                                {error}
                            </p>
                        ))}

                        {mode === 'edit' &&
                            denial_comments.map((denial) => (
                                <div
                                    key={`${denial.revision_number}-${denial.decided_at}`}
                                    className="notice notice-danger mt-4"
                                    role="status"
                                >
                                    <p className="font-semibold">
                                        Revision {denial.revision_number} denial comment
                                    </p>
                                    <p className="mt-2 whitespace-pre-wrap">{denial.comment}</p>
                                    <p className="mt-2 text-red-800">
                                        {denial.decided_by} |{' '}
                                        <OperationalTimestamp value={denial.decided_at} />
                                    </p>
                                </div>
                            ))}

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            {can_select_prosecutor && (
                                <FormField
                                    id="case-assigned-prosecutor"
                                    label="Prosecutor"
                                    error={errors.assigned_prosecutor_id}
                                >
                                    {(controlProps) => (
                                        <select
                                            {...controlProps}
                                            className="input"
                                            value={data.assigned_prosecutor_id}
                                            onChange={(event) =>
                                                setData(
                                                    'assigned_prosecutor_id',
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            {prosecutors.map((prosecutor) => (
                                                <option key={prosecutor.id} value={prosecutor.id}>
                                                    {prosecutor.label}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </FormField>
                            )}
                            <FormField id="case-date" label="Date" error={errors.date}>
                                {(controlProps) => (
                                    <input
                                        {...controlProps}
                                        className="input"
                                        type="date"
                                        value={data.date}
                                        onChange={(event) => setData('date', event.target.value)}
                                    />
                                )}
                            </FormField>
                            <FormField
                                id="case-hearing-date-1"
                                label="1st Hearing Date & Time"
                                error={errors.hearing_date_1}
                            >
                                {(controlProps) => (
                                    <input
                                        {...controlProps}
                                        className="input"
                                        type="datetime-local"
                                        value={data.hearing_date_1 ?? ''}
                                        onChange={(event) =>
                                            setData('hearing_date_1', event.target.value)
                                        }
                                    />
                                )}
                            </FormField>
                            <FormField
                                id="case-hearing-date-2"
                                label="2nd Hearing Date & Time"
                                error={errors.hearing_date_2}
                            >
                                {(controlProps) => (
                                    <input
                                        {...controlProps}
                                        className="input"
                                        type="datetime-local"
                                        value={data.hearing_date_2 ?? ''}
                                        onChange={(event) =>
                                            setData('hearing_date_2', event.target.value)
                                        }
                                    />
                                )}
                            </FormField>
                            <FormField
                                id="case-police-station"
                                label="Police Station"
                                error={errors.police_station}
                            >
                                {(controlProps) => (
                                    <>
                                        <input
                                            {...controlProps}
                                            className="input"
                                            list={
                                                police_stations.length > 0
                                                    ? 'legacy-police-stations'
                                                    : undefined
                                            }
                                            value={data.police_station}
                                            onChange={(event) =>
                                                setData('police_station', event.target.value)
                                            }
                                        />
                                        {police_stations.length > 0 && (
                                            <datalist id="legacy-police-stations">
                                                {police_stations.map((station) => (
                                                    <option key={station} value={station} />
                                                ))}
                                            </datalist>
                                        )}
                                    </>
                                )}
                            </FormField>
                        </div>
                    </div>

                    <div className="surface surface-body">
                        <h2 className="section-title">Crimes</h2>
                        <div className="mt-4">
                            <CrimeAutocomplete
                                offenses={offenses}
                                selectedIds={data.offense_ids}
                                onChange={(ids) => setData('offense_ids', ids)}
                                error={offenseError}
                            />
                        </div>
                    </div>

                    <div className="surface surface-body">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <h2 className="section-title">Parties</h2>
                            <div className="flex flex-wrap gap-2">
                                {partyRoles.map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => addParty(role)}
                                        className="btn btn-neutral"
                                    >
                                        Add {role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 space-y-4">
                            {data.parties.map((party, index) => (
                                <fieldset
                                    key={index}
                                    className="rounded-md border border-slate-200 p-4"
                                >
                                    <legend className="px-2 text-sm font-semibold text-slate-700">
                                        {party.role}
                                    </legend>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <FormField
                                            id={`case-party-${index}-role`}
                                            label="Role"
                                            error={errors[`parties.${index}.role`]}
                                        >
                                            {(controlProps) => (
                                                <select
                                                    {...controlProps}
                                                    className="input"
                                                    value={party.role}
                                                    onChange={(event) =>
                                                        setParty(index, 'role', event.target.value)
                                                    }
                                                >
                                                    {partyRoles.map((role) => (
                                                        <option key={role} value={role}>
                                                            {role}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </FormField>
                                        <FormField
                                            id={`case-party-${index}-first-name`}
                                            label="First Name"
                                            error={errors[`parties.${index}.first_name`]}
                                        >
                                            {(controlProps) => (
                                                <input
                                                    {...controlProps}
                                                    className="input"
                                                    value={party.first_name}
                                                    onChange={(event) =>
                                                        setParty(
                                                            index,
                                                            'first_name',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            )}
                                        </FormField>
                                        <FormField
                                            id={`case-party-${index}-middle-name`}
                                            label="Middle Name"
                                            error={errors[`parties.${index}.middle_name`]}
                                        >
                                            {(controlProps) => (
                                                <input
                                                    {...controlProps}
                                                    className="input"
                                                    value={party.middle_name}
                                                    onChange={(event) =>
                                                        setParty(
                                                            index,
                                                            'middle_name',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            )}
                                        </FormField>
                                        <FormField
                                            id={`case-party-${index}-last-name`}
                                            label="Last Name"
                                            error={errors[`parties.${index}.last_name`]}
                                        >
                                            {(controlProps) => (
                                                <input
                                                    {...controlProps}
                                                    className="input"
                                                    value={party.last_name}
                                                    onChange={(event) =>
                                                        setParty(
                                                            index,
                                                            'last_name',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            )}
                                        </FormField>
                                        <FormField
                                            id={`case-party-${index}-suffix`}
                                            label="Suffix"
                                            error={errors[`parties.${index}.suffix`]}
                                        >
                                            {(controlProps) => (
                                                <select
                                                    {...controlProps}
                                                    className="input"
                                                    value={party.suffix}
                                                    onChange={(event) =>
                                                        setParty(
                                                            index,
                                                            'suffix',
                                                            event.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="">None</option>
                                                    {['Jr.', 'Sr.', 'II', 'III', 'IV'].map(
                                                        (suffix) => (
                                                            <option key={suffix} value={suffix}>
                                                                {suffix}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            )}
                                        </FormField>
                                        <FormField
                                            id={`case-party-${index}-date-of-birth`}
                                            label="Date of Birth"
                                            error={errors[`parties.${index}.date_of_birth`]}
                                        >
                                            {(controlProps) => (
                                                <input
                                                    {...controlProps}
                                                    className="input"
                                                    type="date"
                                                    value={party.date_of_birth}
                                                    onChange={(event) =>
                                                        setParty(
                                                            index,
                                                            'date_of_birth',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            )}
                                        </FormField>
                                        <FormField
                                            id={`case-party-${index}-sex`}
                                            label="Sex"
                                            error={errors[`parties.${index}.sex`]}
                                        >
                                            {(controlProps) => (
                                                <select
                                                    {...controlProps}
                                                    className="input"
                                                    value={party.sex}
                                                    onChange={(event) =>
                                                        setParty(index, 'sex', event.target.value)
                                                    }
                                                >
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            )}
                                        </FormField>
                                        <CascadingAddressFields
                                            index={index}
                                            party={party}
                                            regions={regions}
                                            errors={errors}
                                            onChange={(nextParty) => replaceParty(index, nextParty)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeParty(index)}
                                        className="btn btn-danger mt-4"
                                        disabled={data.parties.length <= 2}
                                    >
                                        Remove Party
                                    </button>
                                </fieldset>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={processing} className="btn btn-primary">
                            {processing
                                ? mode === 'create'
                                    ? 'Creating...'
                                    : 'Saving...'
                                : mode === 'create'
                                  ? 'Create Case'
                                  : 'Save Revision'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
