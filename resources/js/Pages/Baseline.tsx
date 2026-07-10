type BaselineProps = {
    milestone: string;
    domainGate: string;
};

export default function Baseline({ milestone, domainGate }: BaselineProps) {
    return (
        <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
            <section className="mx-auto max-w-5xl">
                <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">
                    LexVerdict
                </p>
                <h1 className="mt-3 text-3xl font-semibold">{milestone}</h1>
                <p className="mt-4 max-w-3xl text-base text-slate-700">{domainGate}</p>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {[
                        ['Architecture', 'Laravel, Inertia, React, TypeScript, Tailwind'],
                        ['Database', 'PostgreSQL configured for test baseline'],
                        ['Domain', 'No legal workflow features implemented in M0'],
                    ].map(([label, value]) => (
                        <div
                            key={label}
                            className="rounded-md border border-slate-200 bg-white p-4"
                        >
                            <h2 className="text-sm font-semibold text-slate-600">{label}</h2>
                            <p className="mt-2 text-sm text-slate-900">{value}</p>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
