<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Reports\CaseReportPdfRenderer;
use App\Domain\Reports\CaseReportQuery;
use App\Domain\Reports\ReportFilters;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ReportRequest;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Support\AuditRecorder;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly CaseReportQuery $reports,
        private readonly CaseReportPdfRenderer $pdfRenderer,
        private readonly AuditRecorder $audit,
    ) {}

    public function index(ReportRequest $request): InertiaResponse
    {
        $filters = ReportFilters::from($request->validated());
        $report = $filters->hasAny() ? $this->reports->run($filters) : null;
        if ($report !== null) {
            unset($report['rows']);
        }

        return Inertia::render('Admin/Reports/Index', [
            'report' => $report,
            'filters' => $filters->toArray(),
            'offenses' => Offense::query()->orderBy('name')->get(['id', 'name']),
            'stations' => LegalCase::query()->select('police_station')->distinct()->orderBy('police_station')->pluck('police_station'),
            'export_query' => http_build_query($filters->toArray()),
        ]);
    }

    public function pdf(ReportRequest $request): Response
    {
        $filters = ReportFilters::from($request->validated());
        $report = $this->reports->run($filters);

        $this->recordExport($request, 'pdf', $filters, count($report['rows']));

        return response($this->pdfRenderer->render($report, $this->filterLabels($filters)), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="lexverdict_report.pdf"',
            'Cache-Control' => 'no-store, private',
            'Pragma' => 'no-cache',
        ]);
    }

    public function csv(ReportRequest $request): StreamedResponse
    {
        $filters = ReportFilters::from($request->validated());
        $report = $this->reports->run($filters);

        $this->recordExport($request, 'csv', $filters, count($report['rows']));

        return response()->streamDownload(function () use ($report): void {
            $stream = fopen('php://output', 'wb');
            if ($stream === false) {
                return;
            }

            fputcsv($stream, ['Docket Number', 'Date Filed', 'Verdict', 'Case Type', 'Police Station']);
            foreach ($report['rows'] as $row) {
                fputcsv($stream, [
                    $this->csvCell($row['docket_number']),
                    $this->csvCell($row['date_filed']),
                    $this->csvCell($row['verdict']),
                    $this->csvCell($row['case_type']),
                    $this->csvCell($row['police_station']),
                ]);
            }

            fclose($stream);
        }, 'lexverdict_report.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** @return list<string> */
    private function filterLabels(ReportFilters $filters): array
    {
        $labels = [];
        if ($filters->startDate !== null && $filters->endDate !== null) {
            $labels[] = "Date: {$filters->startDate} to {$filters->endDate}";
        }
        if ($filters->verdict !== null) {
            $labels[] = "Verdict: {$filters->verdict}";
        }
        if ($filters->offenses !== []) {
            $names = Offense::query()->whereIn('id', $filters->offenses)->orderBy('name')->pluck('name')->implode(', ');
            $labels[] = "Case Type: {$names}";
        }
        if ($filters->station !== null) {
            $labels[] = "Police Station: {$filters->station}";
        }
        if ($filters->sex !== null) {
            $labels[] = "Sex: {$filters->sex}";
        }
        if ($filters->ageGroup !== null) {
            $labels[] = "Age Group: {$filters->ageGroup}";
        }

        return $labels;
    }

    private function recordExport(ReportRequest $request, string $format, ReportFilters $filters, int $recordCount): void
    {
        $this->audit->record(
            'report.exported.'.$format,
            $request->user(),
            'CaseReport',
            null,
            ['filters' => $filters->toArray(), 'record_count' => $recordCount],
            $request,
        );
    }

    private function csvCell(mixed $value): string
    {
        $cell = (string) $value;

        return preg_match('/^[=+\-@\t\r]/', $cell) === 1 ? "'".$cell : $cell;
    }
}
