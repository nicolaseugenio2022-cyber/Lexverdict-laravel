import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import type { PageProps } from '../../types/page';
import type { CasePartyForm, CaseRecord, OffenseOption, ProsecutorOption } from './types';

type Props = {
    mode: 'create' | 'edit';
    caseRecord: CaseRecord | null;
    offenses: OffenseOption[];
    prosecutors: ProsecutorOption[];
    partyRoles: Array<'Complainant' | 'Respondent'>;
    can_select_prosecutor: boolean;
};

const blankParty = (role: 'Complainant' | 'Respondent'): CasePartyForm => ({
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
});

export default function Form({ mode, caseRecord, offenses, prosecutors, partyRoles, can_select_prosecutor }: Props) {
    const { flash } = usePage<PageProps>().props;
    const { data, setData, post, patch, processing, errors } = useForm({
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

    function submit(event: FormEvent) {
        event.preventDefault();

        if (mode === 'edit' && caseRecord) {
            patch(`/cases/${caseRecord.id}`);
        } else {
            post('/cases');
        }
    }

    function setParty(index: number, field: keyof CasePartyForm, value: string) {
        const parties = [...data.parties];
        parties[index] = { ...parties[index], [field]: value };
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

    function toggleOffense(id: string) {
        setData('offense_ids', data.offense_ids.includes(id) ? data.offense_ids.filter((offenseId) => offenseId !== id) : [...data.offense_ids, id]);
    }

    return (
        <AuthenticatedLayout>
            <Head title={mode === 'create' ? 'Create Case' : `Revise ${caseRecord?.docket_number ?? 'Case'}`} />
            <form onSubmit={submit} className="space-y-5">
                <div className="rounded-md border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">{mode === 'create' ? 'Create Case' : `Revise ${caseRecord?.docket_number}`}</h1>
                            <p className="text-sm text-slate-600">Docket number allocation remains server-controlled.</p>
                        </div>
                        <Link href={caseRecord ? `/cases/${caseRecord.id}` : '/cases'} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            Cancel
                        </Link>
                    </div>

                    {caseErrors.map((error) => (
                        <p key={error} className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            {error}
                        </p>
                    ))}

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {can_select_prosecutor && (
                            <Field label="Prosecutor" error={errors.assigned_prosecutor_id}>
                                <select className="input" value={data.assigned_prosecutor_id} onChange={(event) => setData('assigned_prosecutor_id', event.target.value)}>
                                    {prosecutors.map((prosecutor) => (
                                        <option key={prosecutor.id} value={prosecutor.id}>
                                            {prosecutor.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}
                        <Field label="Date" error={errors.date}>
                            <input className="input" type="date" value={data.date} onChange={(event) => setData('date', event.target.value)} />
                        </Field>
                        <Field label="1st Hearing Date & Time" error={errors.hearing_date_1}>
                            <input className="input" type="datetime-local" value={data.hearing_date_1 ?? ''} onChange={(event) => setData('hearing_date_1', event.target.value)} />
                        </Field>
                        <Field label="2nd Hearing Date & Time" error={errors.hearing_date_2}>
                            <input className="input" type="datetime-local" value={data.hearing_date_2 ?? ''} onChange={(event) => setData('hearing_date_2', event.target.value)} />
                        </Field>
                        <Field label="Police Station" error={errors.police_station}>
                            <input className="input" value={data.police_station} onChange={(event) => setData('police_station', event.target.value)} />
                        </Field>
                    </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Crimes</h2>
                    {errors.offense_ids && <p className="mt-2 text-sm text-red-700">{errors.offense_ids}</p>}
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {offenses.map((offense) => (
                            <label key={offense.id} className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                                <input type="checkbox" checked={data.offense_ids.includes(offense.id)} onChange={() => toggleOffense(offense.id)} className="h-4 w-4" />
                                <span>
                                    <span className="font-medium">{offense.name}</span>
                                    {offense.law_reference && <span className="ml-2 text-slate-600">{offense.law_reference}</span>}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-lg font-semibold">Parties</h2>
                        <div className="flex flex-wrap gap-2">
                            {partyRoles.map((role) => (
                                <button key={role} type="button" onClick={() => addParty(role)} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                                    Add {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 space-y-4">
                        {data.parties.map((party, index) => (
                            <fieldset key={index} className="rounded-md border border-slate-200 p-4">
                                <legend className="px-2 text-sm font-semibold text-slate-700">{party.role}</legend>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Field label="Role">
                                        <select className="input" value={party.role} onChange={(event) => setParty(index, 'role', event.target.value)}>
                                            {partyRoles.map((role) => (
                                                <option key={role} value={role}>
                                                    {role}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="First Name" error={errors[`parties.${index}.first_name`]}>
                                        <input className="input" value={party.first_name} onChange={(event) => setParty(index, 'first_name', event.target.value)} />
                                    </Field>
                                    <Field label="Middle Name" error={errors[`parties.${index}.middle_name`]}>
                                        <input className="input" value={party.middle_name} onChange={(event) => setParty(index, 'middle_name', event.target.value)} />
                                    </Field>
                                    <Field label="Last Name" error={errors[`parties.${index}.last_name`]}>
                                        <input className="input" value={party.last_name} onChange={(event) => setParty(index, 'last_name', event.target.value)} />
                                    </Field>
                                    <Field label="Suffix" error={errors[`parties.${index}.suffix`]}>
                                        <select className="input" value={party.suffix} onChange={(event) => setParty(index, 'suffix', event.target.value)}>
                                            <option value="">None</option>
                                            {['Jr.', 'Sr.', 'II', 'III', 'IV'].map((suffix) => (
                                                <option key={suffix} value={suffix}>
                                                    {suffix}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Date of Birth" error={errors[`parties.${index}.date_of_birth`]}>
                                        <input className="input" type="date" value={party.date_of_birth} onChange={(event) => setParty(index, 'date_of_birth', event.target.value)} />
                                    </Field>
                                    <Field label="Sex" error={errors[`parties.${index}.sex`]}>
                                        <select className="input" value={party.sex} onChange={(event) => setParty(index, 'sex', event.target.value)}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </Field>
                                    <Field label="Street" error={errors[`parties.${index}.street`]}>
                                        <input className="input" value={party.street} onChange={(event) => setParty(index, 'street', event.target.value)} />
                                    </Field>
                                    <Field label="Barangay" error={errors[`parties.${index}.barangay`]}>
                                        <input className="input" value={party.barangay} onChange={(event) => setParty(index, 'barangay', event.target.value)} />
                                    </Field>
                                    <Field label="Municipality" error={errors[`parties.${index}.municipality`]}>
                                        <input className="input" value={party.municipality} onChange={(event) => setParty(index, 'municipality', event.target.value)} />
                                    </Field>
                                    <Field label="Province" error={errors[`parties.${index}.province`]}>
                                        <input className="input" value={party.province} onChange={(event) => setParty(index, 'province', event.target.value)} />
                                    </Field>
                                    <Field label="Region" error={errors[`parties.${index}.region`]}>
                                        <input className="input" value={party.region} onChange={(event) => setParty(index, 'region', event.target.value)} />
                                    </Field>
                                </div>
                                <button type="button" onClick={() => removeParty(index)} className="mt-4 min-h-11 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={data.parties.length <= 2}>
                                    Remove Party
                                </button>
                            </fieldset>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" disabled={processing} className="min-h-11 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-50">
                        {mode === 'create' ? 'Create Case' : 'Save Revision'}
                    </button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <label className="block text-sm font-medium text-slate-700">
            {label}
            <div className="mt-2">{children}</div>
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </label>
    );
}
