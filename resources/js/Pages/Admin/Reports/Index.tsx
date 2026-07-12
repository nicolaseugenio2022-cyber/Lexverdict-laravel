import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

type Distribution = { label: string; count: number; percent: number };
type Report = {
    total_cases: number;
    filed: number;
    dismissed: number;
    most_common_crime: string | null;
    offense_distribution: Distribution[];
    verdict_distribution: Distribution[];
    sex_distribution: Distribution[];
    age_distribution: Distribution[];
    station_distribution: Distribution[];
};
type Filters = {
    start_date?: string;
    end_date?: string;
    verdict?: string;
    offenses?: string[];
    station?: string;
    sex?: string;
    age_group?: string;
};
type Props = {
    report: Report | null;
    filters: Filters;
    offenses: { id: string; name: string }[];
    stations: string[];
    export_query: string;
};

function DistributionSection({ title, data }: { title: string; data: Distribution[] }) {
    const maximum = Math.max(...data.map((item) => item.count), 1);

    return (
        <section className="border-t border-slate-200 pt-5">
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            {data.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No data</p>
            ) : (
                <>
                    <figure aria-label={`${title} chart`} className="mt-4 space-y-3">
                        {data.map((item) => (
                            <div key={item.label}>
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="font-medium text-slate-800">{item.label}</span>
                                    <span className="tabular-nums text-slate-600">{item.count}</span>
                                </div>
                                <div className="mt-1 h-2 overflow-hidden bg-slate-200" aria-hidden="true">
                                    <div className="h-full bg-blue-900" style={{ width: `${(item.count / maximum) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </figure>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <caption className="sr-only">{title} tabular data</caption>
                            <thead className="border-b border-slate-300 text-xs uppercase text-slate-600">
                                <tr><th className="py-2 pr-3">Category</th><th className="py-2 pr-3">Count</th><th className="py-2">Percent</th></tr>
                            </thead>
                            <tbody>
                                {data.map((item) => (
                                    <tr key={item.label} className="border-b border-slate-100">
                                        <td className="py-2 pr-3 font-medium">{item.label}</td>
                                        <td className="py-2 pr-3 tabular-nums">{item.count}</td>
                                        <td className="py-2 tabular-nums">{item.percent.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}

export default function Index({ report, filters, offenses, stations, export_query }: Props) {
    const exportSuffix = export_query ? `?${export_query}` : '';

    return (
        <AuthenticatedLayout>
            <Head title="Case Report" />
            <div className="space-y-6">
                <header className="flex flex-col gap-3 border-b border-slate-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-blue-900">Administrator</p>
                        <h1 className="mt-1 text-2xl font-semibold">Case Report</h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <a href={`/admin/reports/pdf${exportSuffix}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">Generate Report PDF</a>
                        <a href={`/admin/reports/csv${exportSuffix}`} className="inline-flex min-h-11 items-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2">Export CSV</a>
                    </div>
                </header>

                <form method="get" action="/admin/reports" className="grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-sm font-medium">Date From
                        <input type="date" name="start_date" defaultValue={filters.start_date ?? ''} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900" />
                    </label>
                    <label className="text-sm font-medium">Date To
                        <input type="date" name="end_date" defaultValue={filters.end_date ?? ''} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900" />
                    </label>
                    <label className="text-sm font-medium">Case Status
                        <select name="verdict" defaultValue={filters.verdict ?? ''} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            <option value="">All</option><option value="For Filing">Filed</option><option value="Dismissed">Dismissed</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">Police Station
                        <select name="station" defaultValue={filters.station ?? ''} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            <option value="">All</option>{stations.map((station) => <option key={station} value={station}>{station}</option>)}
                        </select>
                    </label>
                    <label className="text-sm font-medium sm:col-span-2">Case Type
                        <select multiple name="offenses[]" defaultValue={filters.offenses ?? []} className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            {offenses.map((offense) => <option key={offense.id} value={offense.id}>{offense.name}</option>)}
                        </select>
                    </label>
                    <label className="text-sm font-medium">Sex
                        <select name="sex" defaultValue={filters.sex ?? ''} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            <option value="">All</option><option value="Male">Male</option><option value="Female">Female</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">Age Group
                        <select name="age_group" defaultValue={filters.age_group ?? ''} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900">
                            <option value="">All</option>{['0-17', '18-30', '31-45', '46-60', '61+'].map((group) => <option key={group} value={group}>{group}</option>)}
                        </select>
                    </label>
                    <div className="flex items-end gap-2 lg:col-span-4">
                        <button type="submit" className="min-h-11 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2">Generate</button>
                        <a href="/admin/reports" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900">Clear</a>
                    </div>
                </form>

                {!report ? (
                    <p className="py-8 text-sm text-slate-600">Select report filters and generate the Case Report.</p>
                ) : (
                    <>
                        <section aria-label="Case summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[['Total Cases', report.total_cases], ['Cases Filed', report.filed], ['Cases Dismissed', report.dismissed], ['Top Case Type', report.most_common_crime ?? 'N/A']].map(([label, value]) => (
                                <dl key={label} className="rounded-md border border-slate-200 bg-white p-4"><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd></dl>
                            ))}
                        </section>
                        <div className="grid gap-x-8 gap-y-7 lg:grid-cols-2">
                            <DistributionSection title="Crime Distribution" data={report.offense_distribution} />
                            <DistributionSection title="Verdict Distribution" data={report.verdict_distribution} />
                            <DistributionSection title="Sex Distribution" data={report.sex_distribution} />
                            <DistributionSection title="Age Group of Victims" data={report.age_distribution} />
                            <DistributionSection title="Cases per Police Station" data={report.station_distribution} />
                        </div>
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
