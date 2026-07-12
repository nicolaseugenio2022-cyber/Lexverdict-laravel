<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>LexVerdict - Case Report</title>
    <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { margin: 0; color: #111827; font-family: Arial, sans-serif; font-size: 10px; line-height: 1.35; }
        h1 { margin: 0; color: #1e3a8a; font-size: 20px; text-transform: uppercase; }
        h2 { margin: 0 0 6px; color: #1e3a8a; font-size: 12px; text-transform: uppercase; }
        header { border-bottom: 2px solid #1e3a8a; padding-bottom: 7px; }
        .meta { margin: 7px 0 10px; color: #475569; font-style: italic; }
        .columns { display: table; width: 100%; table-layout: fixed; }
        .column { display: table-cell; width: 33.33%; padding-right: 8px; vertical-align: top; }
        .column:last-child { padding-right: 0; }
        .section { margin-bottom: 8px; border: 1px solid #cbd5e1; padding: 7px; page-break-inside: avoid; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; }
        th { background: #e9eef5; color: #1e3a8a; }
        .summary div { margin-bottom: 3px; }
        .bar { display: inline-block; height: 6px; background: #1e3a8a; vertical-align: middle; }
        .muted { color: #475569; }
    </style>
</head>
<body>
<header><h1>LexVerdict - Case Report</h1></header>
<div class="meta">Generated: {{ $filters === [] ? 'All Records' : implode('; ', $filters) }}</div>

<div class="columns">
    <div class="column">
        <section class="section summary">
            <h2>Summary</h2>
            <div><strong>Total Cases:</strong> {{ $report['total_cases'] }}</div>
            <div><strong>Cases Filed:</strong> {{ $report['filed'] }}</div>
            <div><strong>Cases Dismissed:</strong> {{ $report['dismissed'] }}</div>
            <div><strong>Top Case Type:</strong> {{ $report['most_common_crime'] ?? 'N/A' }}</div>
        </section>

        <section class="section">
            <h2>Crime Distribution</h2>
            <table>
                <thead><tr><th>Crime</th><th>Count</th><th>Share</th></tr></thead>
                <tbody>
                @forelse ($report['offense_distribution'] as $item)
                    <tr>
                        <td>{{ $item['label'] }}</td>
                        <td>{{ $item['count'] }}</td>
                        <td><span class="bar" style="width: {{ $item['percent'] }}%"></span> <span class="muted">{{ $item['percent'] }}%</span></td>
                    </tr>
                @empty
                    <tr><td colspan="3">No data</td></tr>
                @endforelse
                </tbody>
            </table>
        </section>
    </div>

    <div class="column">
        @foreach ([['Verdict Breakdown', 'verdict_distribution', 'Verdict'], ['Sex Breakdown', 'sex_distribution', 'Sex'], ['Age Group Breakdown', 'age_distribution', 'Age Group']] as [$title, $key, $label])
            <section class="section">
                <h2>{{ $title }}</h2>
                <table>
                    <thead><tr><th>{{ $label }}</th><th>Count</th><th>Percent</th></tr></thead>
                    <tbody>
                    @forelse ($report[$key] as $item)
                        <tr><td>{{ $item['label'] }}</td><td>{{ $item['count'] }}</td><td>{{ $item['percent'] }}%</td></tr>
                    @empty
                        <tr><td colspan="3">No data</td></tr>
                    @endforelse
                    </tbody>
                </table>
            </section>
        @endforeach
    </div>

    <div class="column">
        <section class="section">
            <h2>Top Police Stations</h2>
            <table>
                <thead><tr><th>Police Station</th><th>Count</th></tr></thead>
                <tbody>
                @forelse ($report['station_distribution'] as $item)
                    <tr><td>{{ $item['label'] }}</td><td>{{ $item['count'] }}</td></tr>
                @empty
                    <tr><td colspan="2">No data</td></tr>
                @endforelse
                </tbody>
            </table>
        </section>
    </div>
</div>
</body>
</html>
