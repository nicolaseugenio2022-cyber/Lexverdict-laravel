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
import CaseTypeFilter from './CaseTypeFilter';

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
type ReportScopeItem = { label: string; value: string };

const reportStatusLabels: Record<string, string> = {
    'For Filing': 'Filed',
    Dismissed: 'Dismissed',
};

const chartColorTokens = [
    '--lv-chart-1',
    '--lv-chart-2',
    '--lv-chart-3',
    '--lv-chart-4',
    '--lv-chart-5',
    '--lv-chart-6',
];

function cssToken(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartData(data: Distribution[], label: string) {
    const chartColors = chartColorTokens.map(cssToken);

    return {
        labels: data.map((item) => item.label),
        datasets: [
            {
                label,
                data: data.map((item) => item.count),
                backgroundColor: data.map((_, index) => chartColors[index % chartColors.length]),
                borderColor: cssToken('--lv-surface'),
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
            labels: {
                boxWidth: 12,
                padding: 16,
                color: cssToken('--lv-text-secondary'),
                usePointStyle: true,
            },
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
        <section
            className="surface-elevated surface-body min-w-0"
            aria-labelledby={`${slug}-title`}
        >
            <h2 id={`${slug}-title`} className="section-title">
                {title}
            </h2>
            {data.length === 0 ? (
                <div className="mt-3 border-t border-slate-200">
                    <EmptyState
                        title={`No ${title.toLowerCase()} data is available.`}
                        description="The current report selection contains no records for this distribution."
                    />
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
                        <table className="data-table sticky-table-header table-fixed">
                            <thead className="border-b border-slate-300 text-xs uppercase text-slate-600">
                                <tr>
                                    <th className="table-heading w-1/2">Category</th>
                                    <th className="table-heading w-1/4 text-right">Count</th>
                                    <th className="table-heading w-1/4 text-right">Percent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item) => (
                                    <tr key={item.label} className="border-b border-slate-100">
                                        <td className="table-cell table-cell-primary break-words">
                                            {item.label}
                                        </td>
                                        <td className="table-cell table-cell-numeric">
                                            {item.count}
                                        </td>
                                        <td className="table-cell table-cell-numeric">
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

function reportScopeItems(filters: Filters, offenses: Props['offenses']): ReportScopeItem[] {
    const items: ReportScopeItem[] = [];

    if (filters.start_date && filters.end_date) {
        items.push({ label: 'Date', value: `${filters.start_date} to ${filters.end_date}` });
    }

    const statusLabel = filters.verdict ? reportStatusLabels[filters.verdict] : undefined;
    if (statusLabel) items.push({ label: 'Case Status', value: statusLabel });

    const selectedOffenseIds = new Set(filters.offenses ?? []);
    const selectedOffenseNames = offenses
        .filter((offense) => selectedOffenseIds.has(offense.id))
        .map((offense) => offense.name);
    if (selectedOffenseNames.length > 0) {
        items.push({ label: 'Case Type', value: selectedOffenseNames.join(', ') });
    }

    if (filters.station) items.push({ label: 'Police Station', value: filters.station });
    if (filters.sex) items.push({ label: 'Sex', value: filters.sex });
    if (filters.age_group) items.push({ label: 'Age Group', value: filters.age_group });

    return items;
}

export default function Index({ report, filters, offenses, stations, export_query }: Props) {
    const exportSuffix = export_query ? `?${export_query}` : '';
    const scopeItems = reportScopeItems(filters, offenses);

    return (
        <AuthenticatedLayout printable>
            <Head title="Case Report" />
            <div className="page-stack min-w-0">
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
                                className="btn btn-secondary"
                            >
                                Generate Report PDF
                            </a>
                            <a
                                href={`/admin/reports/csv${exportSuffix}`}
                                className="btn btn-primary"
                            >
                                Export CSV
                            </a>
                        </>
                    }
                />

                <form
                    method="get"
                    action="/admin/reports"
                    className="filter-panel grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <input type="hidden" name="generate" value="1" />
                    <fieldset className="grid min-w-0 gap-3 sm:col-span-2 sm:grid-cols-2">
                        <legend className="sr-only">Date range</legend>
                        <label className="field-label">
                            Date From
                            <input
                                type="date"
                                name="start_date"
                                defaultValue={filters.start_date ?? ''}
                                aria-describedby="report-date-guidance"
                                className="input mt-2"
                            />
                        </label>
                        <label className="field-label">
                            Date To
                            <input
                                type="date"
                                name="end_date"
                                defaultValue={filters.end_date ?? ''}
                                aria-describedby="report-date-guidance"
                                className="input mt-2"
                            />
                        </label>
                        <p id="report-date-guidance" className="metadata-text sm:col-span-2">
                            Date filtering applies only when both Date From and Date To are
                            provided.
                        </p>
                    </fieldset>
                    <label className="field-label">
                        Case Status
                        <select
                            name="verdict"
                            defaultValue={filters.verdict ?? ''}
                            className="input mt-2"
                        >
                            <option value="">All</option>
                            <option value="For Filing">Filed</option>
                            <option value="Dismissed">Dismissed</option>
                        </select>
                    </label>
                    <label className="field-label">
                        Police Station
                        <select
                            name="station"
                            defaultValue={filters.station ?? ''}
                            className="input mt-2"
                        >
                            <option value="">All</option>
                            {stations.map((station) => (
                                <option key={station} value={station}>
                                    {station}
                                </option>
                            ))}
                        </select>
                    </label>
                    <CaseTypeFilter
                        key={export_query}
                        offenses={offenses}
                        initialSelectedIds={filters.offenses ?? []}
                    />
                    <label className="field-label">
                        Sex
                        <select name="sex" defaultValue={filters.sex ?? ''} className="input mt-2">
                            <option value="">All</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </label>
                    <label className="field-label">
                        Age Group
                        <select
                            name="age_group"
                            defaultValue={filters.age_group ?? ''}
                            className="input mt-2"
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
                        <button type="submit" className="btn btn-primary">
                            Generate
                        </button>
                        <a href="/admin/reports" className="btn btn-secondary">
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
                        <section
                            className="surface surface-body"
                            aria-labelledby="report-scope-title"
                        >
                            <h2 id="report-scope-title" className="section-title">
                                Report Scope
                            </h2>
                            {scopeItems.length === 0 ? (
                                <p className="metadata-text mt-2">All Records</p>
                            ) : (
                                <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {scopeItems.map((item) => (
                                        <div key={item.label} className="min-w-0">
                                            <dt className="meta-label">{item.label}</dt>
                                            <dd className="mt-1 break-words text-sm text-slate-900">
                                                {item.value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </section>
                        <section aria-labelledby="case-summary-title">
                            <h2 id="case-summary-title" className="section-title mb-3">
                                Case Summary
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    ['Total Cases', report.total_cases],
                                    ['Cases Filed', report.filed],
                                    ['Cases Dismissed', report.dismissed],
                                    ['Top Case Type', report.most_common_crime ?? 'N/A'],
                                ].map(([label, value]) => (
                                    <dl key={label} className="summary-card">
                                        <dt className="metric-label">{label}</dt>
                                        <dd className="metric-value mt-2">{value}</dd>
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
