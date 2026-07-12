import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

type CaseData = {
    docket_number: string;
    case_type: string;
    prosecutor: string;
    hearing_date_1: string | null;
    hearing_date_2: string | null;
    status: string;
    date_filed: string;
    court_location: string | null;
};

export default function Lookup({ case_data = null }: { case_data?: CaseData | null }) {
    const { data, setData, post, processing, errors, transform } = useForm({ docket: '', pin: '', lookup: '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        transform((values) => ({ docket: values.docket, pin: values.pin, lookup: '' }));
        post('/docket', { preserveScroll: true });
    }

    return (
        <main className="min-h-dvh bg-slate-100 px-4 py-10 text-slate-950">
            <Head title="Case Lookup" />
            <div className="mx-auto w-full max-w-xl">
                <header className="mb-6">
                    <p className="text-sm font-semibold text-blue-900">LexVerdict</p>
                    <h1 className="mt-1 text-2xl font-semibold">Case Lookup</h1>
                </header>

                <form onSubmit={submit} className="rounded-md border border-slate-200 bg-white p-6">
                    <label htmlFor="docket" className="block text-sm font-medium text-slate-700">Docket Number</label>
                    <input id="docket" value={data.docket} onChange={(event) => setData('docket', event.target.value)} autoComplete="off" className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900" />
                    {errors.docket && <p className="mt-2 text-sm text-red-700">{errors.docket}</p>}

                    <label htmlFor="pin" className="mt-4 block text-sm font-medium text-slate-700">PIN Code</label>
                    <input id="pin" type="password" inputMode="numeric" maxLength={6} value={data.pin} onChange={(event) => setData('pin', event.target.value)} autoComplete="off" className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900" />
                    {errors.pin && <p className="mt-2 text-sm text-red-700">{errors.pin}</p>}
                    {errors.lookup && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{errors.lookup}</p>}

                    <button type="submit" disabled={processing} className="mt-6 min-h-11 w-full rounded-md bg-blue-900 px-4 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        Access
                    </button>
                </form>

                {case_data && (
                    <section className="mt-6 rounded-md border border-slate-200 bg-white p-6" aria-labelledby="lookup-result-heading">
                        <h2 id="lookup-result-heading" className="sr-only">Case Lookup Result</h2>
                        <dl className="divide-y divide-slate-200">
                            <Result label="Docket Number" value={case_data.docket_number} />
                            <Result label="Case Type" value={case_data.case_type} />
                            <Result label="Prosecutor" value={case_data.prosecutor} />
                            <Result label="1st Hearing" value={case_data.hearing_date_1 ?? ''} />
                            <Result label="2nd Hearing" value={case_data.hearing_date_2 ?? ''} />
                            <Result label="Status" value={case_data.status} />
                            <Result label="Date Filed" value={case_data.date_filed} />
                            {case_data.court_location !== null && <Result label="Court Location" value={case_data.court_location} />}
                        </dl>
                        <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">This information is based on the latest resolution data available from the prosecutor&apos;s office.</p>
                    </section>
                )}
            </div>
        </main>
    );
}

function Result({ label, value }: { label: string; value: string }) {
    return <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4"><dt className="font-medium text-slate-700">{label}</dt><dd className="break-words text-slate-950 sm:text-right">{value}</dd></div>;
}
