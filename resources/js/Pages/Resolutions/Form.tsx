import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import type { PageProps } from '../../types/page';
import type { ResolutionDecision, ResolutionRecord } from './types';

type Props = {
    mode: 'create' | 'edit';
    caseRecord: { id: string; docket_number: string };
    resolution: ResolutionRecord | null;
    verdicts: Array<'For Filing' | 'Dismissed'>;
    denial_comments: ResolutionDecision[];
};

export default function Form({ mode, caseRecord, resolution, verdicts, denial_comments }: Props) {
    const { flash } = usePage<PageProps>().props;
    const form = useForm({
        revision_number: resolution?.revision_number ?? 1,
        verdict: resolution?.verdict === 'Dismissed' ? 'Dismissed' : 'For Filing',
        court: resolution?.court ?? '',
    });
    const workflowErrors = flash.errors.resolution ?? [];
    const requiresCourt = form.data.verdict === 'For Filing';

    function setVerdict(verdict: 'For Filing' | 'Dismissed') {
        form.setData((data) => ({ ...data, verdict, court: verdict === 'Dismissed' ? '' : data.court }));
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        if (mode === 'edit' && resolution) {
            form.patch(`/resolutions/${resolution.id}`);
        } else {
            form.post(`/cases/${caseRecord.id}/resolution`);
        }
    }

    return (
        <AuthenticatedLayout>
            <Head title={`${mode === 'create' ? 'Submit' : 'Revise'} Resolution ${caseRecord.docket_number}`} />
            <form onSubmit={submit} className="space-y-5">
                <section className="rounded-md border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-blue-900">Resolution</p>
                            <h1 className="mt-1 text-xl font-semibold">{mode === 'create' ? 'Submit' : 'Revise'} {caseRecord.docket_number}</h1>
                            <p className="mt-1 text-sm text-slate-600">The verdict date is recorded by the server.</p>
                        </div>
                        <Link href={resolution ? `/resolutions/${resolution.id}` : `/cases/${caseRecord.id}`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            Cancel
                        </Link>
                    </div>

                    {workflowErrors.map((error) => <p key={error} role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>)}
                    {denial_comments.map((decision) => decision.comment && (
                        <div key={`${decision.revision_number}-${decision.decided_at}`} className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="status">
                            <p className="font-semibold">Revision {decision.revision_number} denial comment</p>
                            <p className="mt-2 whitespace-pre-wrap">{decision.comment}</p>
                            <p className="mt-2 text-red-800">{decision.decided_by} | {decision.decided_at}</p>
                        </div>
                    ))}

                    <fieldset className="mt-5">
                        <legend className="text-sm font-semibold text-slate-800">Verdict</legend>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            {verdicts.map((verdict) => (
                                <label key={verdict} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm font-medium ${form.data.verdict === verdict ? 'border-blue-900 bg-blue-50 text-blue-950' : 'border-slate-300 text-slate-700'}`}>
                                    <input type="radio" name="verdict" value={verdict} checked={form.data.verdict === verdict} onChange={() => setVerdict(verdict)} />
                                    {verdict}
                                </label>
                            ))}
                        </div>
                        {form.errors.verdict && <p role="alert" className="mt-2 text-sm text-red-800">{form.errors.verdict}</p>}
                    </fieldset>

                    {requiresCourt && (
                        <label htmlFor="resolution-court" className="mt-5 block text-sm font-medium text-slate-700">
                            Court
                            <input
                                id="resolution-court"
                                required
                                value={form.data.court}
                                onChange={(event) => form.setData('court', event.target.value)}
                                className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            />
                            {form.errors.court && <span role="alert" className="mt-2 block text-sm text-red-800">{form.errors.court}</span>}
                        </label>
                    )}
                </section>

                <div className="flex justify-end">
                    <button type="submit" disabled={form.processing} className="min-h-11 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:cursor-not-allowed disabled:opacity-50">
                        {form.processing ? 'Saving...' : mode === 'create' ? 'Submit Resolution' : 'Resubmit Resolution'}
                    </button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
