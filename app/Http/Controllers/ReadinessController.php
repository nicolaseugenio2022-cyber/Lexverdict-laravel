<?php

namespace App\Http\Controllers;

use App\Support\Operations\OperationalReadiness;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ReadinessController extends Controller
{
    public function __invoke(OperationalReadiness $readiness): JsonResponse
    {
        $result = $readiness->inspect();
        if (! $result['ready']) {
            Log::error('LexVerdict readiness probe failed.', ['checks' => $result['checks']]);
        }

        return response()->json([
            'status' => $result['ready'] ? 'ready' : 'unavailable',
        ], $result['ready'] ? 200 : 503, [
            'Cache-Control' => 'no-store',
        ]);
    }
}
