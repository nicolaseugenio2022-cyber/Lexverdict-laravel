<?php

namespace App\Http\Controllers;

use App\Domain\Dashboard\Queries\OperationalDashboardQuery;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(OperationalDashboardQuery $dashboard): Response
    {
        return Inertia::render('Dashboard', [
            'metrics' => $dashboard->administratorMetrics(),
            'pending_work' => $dashboard->administratorPendingWork(),
            'recent_activity' => $dashboard->recentActivity(5),
        ]);
    }
}
