<?php

namespace App\Domain\Reports;

use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Blade;

class CaseReportPdfRenderer
{
    /**
     * @param  array<string, mixed>  $report
     * @param  list<string>  $filters
     */
    public function render(array $report, array $filters): string
    {
        $template = file_get_contents(resource_path('views/reports/case-report.blade.php'));
        if ($template === false) {
            throw new \RuntimeException('The Case Report template is unavailable.');
        }

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'Arial');

        $dompdf = new Dompdf($options);
        $dompdf->setPaper('a4', 'landscape');
        $dompdf->loadHtml(Blade::render($template, compact('report', 'filters')), 'UTF-8');
        $dompdf->render();

        return $dompdf->output();
    }
}
