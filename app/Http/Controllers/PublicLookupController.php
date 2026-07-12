<?php

namespace App\Http\Controllers;

use App\Domain\Lookup\PublicCaseLookup;
use App\Http\Requests\PublicLookupRequest;
use App\Models\LegalCase;
use App\Support\AuditRecorder;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PublicLookupController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Public/Lookup', ['case_data' => session('case_data')]);
    }

    public function store(PublicLookupRequest $request, PublicCaseLookup $lookup, AuditRecorder $audit): Response|RedirectResponse
    {
        $result = $lookup->find($request->string('docket')->toString(), $request->string('pin')->toString());

        if ($result === null) {
            $audit->record('public.lookup.failed', null, null, null, ['docket_matched' => false], $request);

            return back()->withErrors(['lookup' => 'Invalid Docket Number or PIN']);
        }

        $caseId = LegalCase::query()->where('docket_number', $result['docket_number'])->value('id');
        $audit->record('public.lookup.succeeded', null, LegalCase::class, $caseId, ['docket_matched' => true], $request);

        return redirect()->route('public.lookup')->with('case_data', $result);
    }
}
