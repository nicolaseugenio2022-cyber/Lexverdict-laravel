import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import OperationalTimestamp from '../../Components/OperationalTimestamp';
import PageHeader from '../../Components/PageHeader';
import { useToast } from '../../Components/toast';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
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
    const toast = useToast();
    const { flash } = usePage<PageProps>().props;
    const form = useForm({
        revision_number: resolution?.revision_number ?? 1,
        verdict: resolution?.verdict === 'Dismissed' ? 'Dismissed' : 'For Filing',
        court: resolution?.court ?? '',
    });
    const workflowErrors = flash.errors.resolution ?? [];
    const requiresCourt = form.data.verdict === 'For Filing';
    const { allowNextVisit } = useUnsavedChanges(form.isDirty && !form.processing);

    function setVerdict(verdict: 'For Filing' | 'Dismissed') {
        form.setData((data) => ({
            ...data,
            verdict,
            court: verdict === 'Dismissed' ? '' : data.court,
        }));
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        allowNextVisit();
        if (mode === 'edit' && resolution) {
            form.patch(`/resolutions/${resolution.id}`, {
                onSuccess: () => toast.success('Resolution revised.'),
            });
        } else {
            form.post(`/cases/${caseRecord.id}/resolution`, {
                onSuccess: () => toast.success('Resolution submitted.'),
            });
        }
    }

    return (
        <AuthenticatedLayout>
            <Head
                title={`${mode === 'create' ? 'Submit' : 'Revise'} Resolution ${caseRecord.docket_number}`}
            />
            <div className="page-stack">
                <PageHeader
                    eyebrow="Resolution"
                    title={`${mode === 'create' ? 'Submit' : 'Revise'} ${caseRecord.docket_number}`}
                    description="The verdict date is recorded by the server."
                    actions={
                        <Link
                            href={
                                resolution
                                    ? `/resolutions/${resolution.id}`
                                    : `/cases/${caseRecord.id}`
                            }
                            className="btn btn-secondary"
                        >
                            Cancel
                        </Link>
                    }
                />

                <form onSubmit={submit} className="space-y-5">
                    <section className="surface surface-body">
                        {workflowErrors.map((error) => (
                            <p key={error} role="alert" className="notice notice-danger mt-4">
                                {error}
                            </p>
                        ))}
                        {denial_comments.map(
                            (decision) =>
                                decision.comment && (
                                    <div
                                        key={`${decision.revision_number}-${decision.decided_at}`}
                                        className="notice notice-danger mt-4"
                                        role="status"
                                    >
                                        <p className="font-semibold">
                                            Revision {decision.revision_number} denial comment
                                        </p>
                                        <p className="mt-2 whitespace-pre-wrap">
                                            {decision.comment}
                                        </p>
                                        <p className="mt-2 text-red-800">
                                            {decision.decided_by} |{' '}
                                            <OperationalTimestamp value={decision.decided_at} />
                                        </p>
                                    </div>
                                ),
                        )}

                        <fieldset
                            className="mt-5"
                            aria-invalid={form.errors.verdict ? true : undefined}
                            aria-describedby={
                                form.errors.verdict ? 'resolution-verdict-error' : undefined
                            }
                        >
                            <legend className="field-label">Verdict</legend>
                            <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                {verdicts.map((verdict) => {
                                    const verdictId = `resolution-verdict-${verdict
                                        .toLowerCase()
                                        .replaceAll(' ', '-')}`;

                                    return (
                                        <label
                                            key={verdict}
                                            htmlFor={verdictId}
                                            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm font-medium ${form.data.verdict === verdict ? 'border-blue-900 bg-blue-50 text-blue-950' : 'border-slate-300 text-slate-700'}`}
                                        >
                                            <input
                                                id={verdictId}
                                                type="radio"
                                                name="verdict"
                                                value={verdict}
                                                checked={form.data.verdict === verdict}
                                                aria-invalid={
                                                    form.errors.verdict ? true : undefined
                                                }
                                                aria-describedby={
                                                    form.errors.verdict
                                                        ? 'resolution-verdict-error'
                                                        : undefined
                                                }
                                                onChange={() => setVerdict(verdict)}
                                            />
                                            {verdict}
                                        </label>
                                    );
                                })}
                            </div>
                            {form.errors.verdict && (
                                <p
                                    id="resolution-verdict-error"
                                    role="alert"
                                    className="mt-2 text-sm text-red-800"
                                >
                                    {form.errors.verdict}
                                </p>
                            )}
                        </fieldset>

                        {requiresCourt && (
                            <label
                                htmlFor="resolution-court"
                                className="mt-5 block text-sm font-medium text-slate-700"
                            >
                                Court
                                <input
                                    id="resolution-court"
                                    required
                                    value={form.data.court}
                                    aria-invalid={form.errors.court ? true : undefined}
                                    aria-describedby={
                                        form.errors.court ? 'resolution-court-error' : undefined
                                    }
                                    onChange={(event) => form.setData('court', event.target.value)}
                                    className="input mt-2"
                                />
                                {form.errors.court && (
                                    <span
                                        id="resolution-court-error"
                                        role="alert"
                                        className="mt-2 block text-sm text-red-800"
                                    >
                                        {form.errors.court}
                                    </span>
                                )}
                            </label>
                        )}
                    </section>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="btn btn-primary"
                        >
                            {form.processing
                                ? 'Saving...'
                                : mode === 'create'
                                  ? 'Submit Resolution'
                                  : 'Resubmit Resolution'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
