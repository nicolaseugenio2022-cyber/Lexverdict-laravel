import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    RadialLinearScale,
    Tooltip,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Head } from '@inertiajs/react';
import { Bar, Doughnut, Pie, PolarArea } from 'react-chartjs-2';
import EmptyState from '../../../Components/EmptyState';
import PageHeader from '../../../Components/PageHeader';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

ChartJS.register(
    CategoryScale,
    LinearScale,
    RadialLinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
);

type Distribution = { label: string; count: number; percent: number };
type ChartKind = 'bar' | 'horizontal-bar' | 'doughnut' | 'pie' | 'polar-area';
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

const chartColors = ['#1e3a8a', '#b45309', '#047857', '#be123c', '#0369a1', '#6d28d9'];

function chartData(data: Distribution[], label: string) {
    return {
        labels: data.map((item) => item.label),
        datasets: [
            {
                label,
                data: data.map((item) => item.count),
                backgroundColor: data.map((_, index) => chartColors[index % chartColors.length]),
                borderColor: '#ffffff',
                borderWidth: 1,
            },
        ],
    };
}

const sharedRadialOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
            labels: { boxWidth: 12, padding: 16, color: '#334155', usePointStyle: true },
        },
        tooltip: { enabled: true },
    },
};
const doughnutOptions: ChartOptions<'doughnut'> = sharedRadialOptions;
const pieOptions: ChartOptions<'pie'> = sharedRadialOptions;
const polarAreaOptions: ChartOptions<'polarArea'> = sharedRadialOptions;

function DistributionChart({
    title,
    data,
    kind,
}: {
    title: string;
    data: Distribution[];
    kind: ChartKind;
}) {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const dataset = chartData(data, title);
    const barOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        indexAxis: kind === 'horizontal-bar' ? 'y' : 'x',
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
        },
        scales: {
            x: { beginAtZero: true, ticks: { precision: 0 } },
            y: { beginAtZero: true, ticks: { precision: 0 } },
        },
    };

    return (
        <section className="surface min-w-0 p-4 sm:p-5" aria-labelledby={`${slug}-title`}>
            <h2 id={`${slug}-title`} className="text-base font-semibold text-slate-950">
                {title}
            </h2>
            {data.length === 0 ? (
                <div className="mt-3 border-t border-slate-200">
                    <EmptyState title="No data" />
                </div>
            ) : (
                <>
                    <div className="mt-4 h-64 min-w-0 sm:h-72" data-testid={`chart-${slug}`}>
                        {kind === 'bar' && (
                            <Bar data={dataset} options={barOptions} aria-hidden="true" />
                        )}
                        {kind === 'horizontal-bar' && (
                            <Bar data={dataset} options={barOptions} aria-hidden="true" />
                        )}
                        {kind === 'doughnut' && (
                            <Doughnut data={dataset} options={doughnutOptions} aria-hidden="true" />
                        )}
                        {kind === 'pie' && (
                            <Pie data={dataset} options={pieOptions} aria-hidden="true" />
                        )}
                        {kind === 'polar-area' && (
                            <PolarArea
                                data={dataset}
                                options={polarAreaOptions}
                                aria-hidden="true"
                            />
                        )}
                    </div>
                    <div
                        className="mt-5 border-t border-slate-200 pt-2"
                        role="region"
                        aria-label={`${title} tabular data`}
                    >
                        <table className="w-full table-fixed text-left text-sm">
                            <thead className="border-b border-slate-300 text-xs uppercase text-slate-600">
                                <tr>
                                    <th className="w-1/2 py-2 pr-2">Category</th>
                                    <th className="w-1/4 py-2 pr-2 text-right">Count</th>
                                    <th className="w-1/4 py-2 text-right">Percent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item) => (
                                    <tr key={item.label} className="border-b border-slate-100">
                                        <td className="break-words py-2 pr-2 font-medium">
                                            {item.label}
                                        </td>
                                        <td className="py-2 pr-2 text-right tabular-nums">
                                            {item.count}
                                        </td>
                                        <td className="py-2 text-right tabular-nums">
                                            {item.percent.toFixed(1)}%
                                        </td>
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
            <div className="min-w-0 space-y-6">
                <PageHeader
                    eyebrow="Administrator"
                    title="Case Report"
                    description="Generate the approved report dashboard using the available case filters."
                    actions={
                        <>
                            <a
                                href={`/admin/reports/pdf${exportSuffix}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900"
                            >
                                Generate Report PDF
                            </a>
                            <a
                                href={`/admin/reports/csv${exportSuffix}`}
                                className="inline-flex min-h-11 items-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                            >
                                Export CSV
                            </a>
                        </>
                    }
                />

                <form
                    method="get"
                    action="/admin/reports"
                    className="surface grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4"
                >
                    <input type="hidden" name="generate" value="1" />
                    <label className="text-sm font-medium">
                        Date From
                        <input
                            type="date"
                            name="start_date"
                            defaultValue={filters.start_date ?? ''}
                            className="input mt-1"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Date To
                        <input
                            type="date"
                            name="end_date"
                            defaultValue={filters.end_date ?? ''}
                            className="input mt-1"
                        />
                    </label>
                    <label className="text-sm font-medium">
                        Case Status
                        <select
                            name="verdict"
                            defaultValue={filters.verdict ?? ''}
                            className="input mt-1"
                        >
                            <option value="">All</option>
                            <option value="For Filing">Filed</option>
                            <option value="Dismissed">Dismissed</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        Police Station
                        <select
                            name="station"
                            defaultValue={filters.station ?? ''}
                            className="input mt-1"
                        >
                            <option value="">All</option>
                            {stations.map((station) => (
                                <option key={station} value={station}>
                                    {station}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm font-medium sm:col-span-2">
                        Case Type
                        <select
                            multiple
                            name="offenses[]"
                            defaultValue={filters.offenses ?? []}
                            className="input mt-1 min-h-28 py-2"
                        >
                            {offenses.map((offense) => (
                                <option key={offense.id} value={offense.id}>
                                    {offense.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        Sex
                        <select name="sex" defaultValue={filters.sex ?? ''} className="input mt-1">
                            <option value="">All</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium">
                        Age Group
                        <select
                            name="age_group"
                            defaultValue={filters.age_group ?? ''}
                            className="input mt-1"
                        >
                            <option value="">All</option>
                            {['0-17', '18-30', '31-45', '46-60', '61+'].map((group) => (
                                <option key={group} value={group}>
                                    {group}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2 lg:col-span-4">
                        <button
                            type="submit"
                            className="min-h-11 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                        >
                            Generate
                        </button>
                        <a
                            href="/admin/reports"
                            className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900"
                        >
                            Clear
                        </a>
                    </div>
                </form>

                {!report ? (
                    <div className="surface">
                        <EmptyState
                            title="Select report filters and generate the Case Report."
                            description="The report dashboard and summary will appear here."
                        />
                    </div>
                ) : (
                    <>
                        <section aria-labelledby="case-summary-title">
                            <h2 id="case-summary-title" className="mb-3 text-lg font-semibold">
                                Case Summary
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    ['Total Cases', report.total_cases],
                                    ['Cases Filed', report.filed],
                                    ['Cases Dismissed', report.dismissed],
                                    ['Top Case Type', report.most_common_crime ?? 'N/A'],
                                ].map(([label, value]) => (
                                    <dl
                                        key={label}
                                        className="surface border-t-4 border-t-blue-900 p-4"
                                    >
                                        <dt className="text-sm font-medium text-slate-600">
                                            {label}
                                        </dt>
                                        <dd className="mt-2 text-2xl font-semibold tabular-nums">
                                            {value}
                                        </dd>
                                    </dl>
                                ))}
                            </div>
                        </section>
                        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                            <DistributionChart
                                title="Crime Distribution"
                                data={report.offense_distribution}
                                kind="bar"
                            />
                            <DistributionChart
                                title="Cases per Police Station"
                                data={report.station_distribution}
                                kind="horizontal-bar"
                            />
                            <DistributionChart
                                title="Sex Distribution"
                                data={report.sex_distribution}
                                kind="doughnut"
                            />
                            <DistributionChart
                                title="Age Group Distribution"
                                data={report.age_distribution}
                                kind="polar-area"
                            />
                            <DistributionChart
                                title="Verdict Distribution"
                                data={report.verdict_distribution}
                                kind="pie"
                            />
                        </div>
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
