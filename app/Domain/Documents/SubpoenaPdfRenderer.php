<?php

namespace App\Domain\Documents;

use App\Domain\Cases\Enums\PartyRole;
use App\Domain\Documents\Exceptions\DocumentInvariantException;
use App\Models\GeneratedDocument;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Blade;

class SubpoenaPdfRenderer
{
    public function render(GeneratedDocument $document): string
    {
        $html = $this->html($document);

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'Times New Roman');
        $dompdf = new Dompdf($options);
        $dompdf->setPaper([0, 0, 612, 936]);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->render();

        return $dompdf->output();
    }

    public function html(GeneratedDocument $document): string
    {
        $payload = $document->getAttribute('render_payload');
        if (! is_array($payload)
            || ! isset($payload['docket_number'], $payload['date'], $payload['hearing_date_1'], $payload['police_station'], $payload['pin'], $payload['staff_name'])
            || ! is_array($payload['prosecutor'] ?? null)
            || ! is_array($payload['offenses'] ?? null)
            || ! is_array($payload['parties'] ?? null)) {
            throw new DocumentInvariantException('The immutable Subpoena render snapshot is invalid.');
        }

        $parties = collect($payload['parties'])->filter(fn (mixed $party): bool => is_array($party));
        $complainants = $parties->where('role', PartyRole::Complainant->value)->values();
        $respondents = $parties->where('role', PartyRole::Respondent->value)->values();
        $groupedParties = $parties
            ->sortBy('position')
            ->groupBy(fn (array $party): string => mb_strtolower(trim((string) ($party['municipality'] ?? ''))))
            ->values();

        $escaped = array_map(fn (mixed $name): string => e((string) $name), $payload['offenses']);
        $crimesDisplay = $this->crimesDisplay($escaped);

        $template = file_get_contents(resource_path('views/documents/subpoena.blade.php'));
        if ($template === false) {
            throw new DocumentInvariantException('The approved Subpoena template is unavailable.');
        }

        return Blade::render($template, [
            'data' => [
                'docket_number' => (string) $payload['docket_number'],
                'date' => Carbon::parse($payload['date']),
                'hearing_date_1' => Carbon::parse($payload['hearing_date_1']),
                'hearing_date_2' => empty($payload['hearing_date_2']) ? null : Carbon::parse($payload['hearing_date_2']),
                'police_station' => (string) $payload['police_station'],
            ],
            'complainants' => $complainants,
            'respondents' => $respondents,
            'groupedParties' => $groupedParties,
            'crimesDisplay' => $crimesDisplay,
            'prosecutorName' => trim((string) ($payload['prosecutor']['first_name'] ?? '').' '.(string) ($payload['prosecutor']['last_name'] ?? '')),
            'staffName' => (string) $payload['staff_name'],
            'pin' => (string) $payload['pin'],
            'dojLogo' => $this->imageData(resource_path('documents/subpoena/DOJ_logo.jpg'), 'image/jpeg'),
            'bpLogo' => $this->imageData(resource_path('documents/subpoena/BP_logo.png'), 'image/png'),
        ]);
    }

    /** @param list<string> $offenses */
    private function crimesDisplay(array $offenses): string
    {
        return match (count($offenses)) {
            0 => 'No Offense Listed',
            1 => $offenses[0],
            2 => $offenses[0].' and <br>'.$offenses[1],
            3 => $offenses[0].', <br>'.$offenses[1].', and <br>'.$offenses[2],
            default => $offenses[0].', <br>'.$offenses[1].', <br>'.$offenses[2].', etc',
        };
    }

    private function imageData(string $path, string $mime): string
    {
        $bytes = file_get_contents($path);
        if ($bytes === false) {
            throw new DocumentInvariantException('An approved Subpoena image is unavailable.');
        }

        return 'data:'.$mime.';base64,'.base64_encode($bytes);
    }
}
