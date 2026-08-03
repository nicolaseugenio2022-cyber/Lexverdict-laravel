export type OperationalMetric = {
    label: string;
    value: number;
    description: string;
};

type Props = {
    title: string;
    metrics: OperationalMetric[];
};

export default function OperationalSummary({ title, metrics }: Props) {
    if (metrics.length === 0) return null;

    return (
        <section aria-labelledby="operational-summary-heading" className="space-y-3">
            <h2 id="operational-summary-heading" className="section-title">
                {title}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map((metric) => (
                    <div key={metric.label} className="summary-card min-w-0">
                        <dt className="metric-label">{metric.label}</dt>
                        <dd className="metric-value">{metric.value.toLocaleString()}</dd>
                        <dd className="mt-2 text-sm leading-5 text-slate-600">
                            {metric.description}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
