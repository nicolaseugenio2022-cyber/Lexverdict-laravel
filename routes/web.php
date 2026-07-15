<?php

use App\Http\Controllers\Admin\AssignmentController;
use App\Http\Controllers\Admin\AuditEventController;
use App\Http\Controllers\Admin\OffenseController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\CaseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PublicLookupController;
use App\Http\Controllers\ResolutionController;
use App\Http\Controllers\ResolutionReviewController;
use App\Http\Controllers\SecretaryVerificationController;
use App\Http\Controllers\SubpoenaDocumentController;
use App\Http\Controllers\SubpoenaReviewController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('baseline');
Route::get('/docket', [PublicLookupController::class, 'create'])->middleware('cache.headers:no_store;max_age=0;private')->name('public.lookup');
Route::post('/docket', [PublicLookupController::class, 'store'])->middleware(['throttle:5,1', 'cache.headers:no_store;max_age=0;private'])->name('public.lookup.store');

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.store');
});

Route::middleware(['auth', 'active'])->group(function (): void {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    Route::get('/dashboard', DashboardController::class)
        ->middleware('can:view-dashboard')
        ->name('dashboard');
    Route::get('process-server/cases', [CaseController::class, 'index'])
        ->middleware('can:view-process-server-cases')
        ->name('process-server.cases.index');
    Route::resource('cases', CaseController::class)->except(['destroy']);
    Route::post('cases/{case}/documents/subpoena', [SubpoenaDocumentController::class, 'store'])->name('documents.subpoena.store');
    Route::get('cases/{case}/documents/{document}', [SubpoenaDocumentController::class, 'show'])->name('documents.show');
    Route::get('subpoena-reviews', [SubpoenaReviewController::class, 'index'])->name('subpoena-reviews.index');
    Route::get('subpoena-reviews/{case}', [SubpoenaReviewController::class, 'show'])->name('subpoena-reviews.show');
    Route::post('subpoena-reviews/{case}/approve', [SubpoenaReviewController::class, 'approve'])->name('subpoena-reviews.approve');
    Route::post('subpoena-reviews/{case}/deny', [SubpoenaReviewController::class, 'deny'])->name('subpoena-reviews.deny');
    Route::get('secretary/verifying-cases', SecretaryVerificationController::class)
        ->middleware('can:view-secretary-verification')
        ->name('secretary.verification.index');

    Route::get('cases/{case}/resolution/create', [ResolutionController::class, 'create'])->name('resolutions.create');
    Route::post('cases/{case}/resolution', [ResolutionController::class, 'store'])->name('resolutions.store');
    Route::get('resolutions/{resolution}', [ResolutionController::class, 'show'])->name('resolutions.show');
    Route::get('resolutions/{resolution}/edit', [ResolutionController::class, 'edit'])->name('resolutions.edit');
    Route::patch('resolutions/{resolution}', [ResolutionController::class, 'update'])->name('resolutions.update');
    Route::get('resolution-reviews', [ResolutionReviewController::class, 'index'])->name('resolution-reviews.index');
    Route::get('resolution-reviews/{resolution}', [ResolutionReviewController::class, 'show'])->name('resolution-reviews.show');
    Route::post('resolution-reviews/{resolution}/approve', [ResolutionReviewController::class, 'approve'])->name('resolution-reviews.approve');
    Route::post('resolution-reviews/{resolution}/deny', [ResolutionReviewController::class, 'deny'])->name('resolution-reviews.deny');

    Route::prefix('admin')->name('admin.')->group(function (): void {
        Route::middleware('can:manage-offenses')->group(function (): void {
            Route::get('offenses', [OffenseController::class, 'index'])->name('offenses.index');
            Route::post('offenses', [OffenseController::class, 'store'])->name('offenses.store');
            Route::patch('offenses/{offenseId}', [OffenseController::class, 'update'])->name('offenses.update');
            Route::patch('offenses/{offenseId}/deactivate', [OffenseController::class, 'deactivate'])->name('offenses.deactivate');
            Route::patch('offenses/{offenseId}/restore', [OffenseController::class, 'restore'])->name('offenses.restore');
        });

        Route::resource('users', UserController::class)->except(['show', 'destroy']);
        Route::patch('users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
        Route::patch('users/{user}/restore', [UserController::class, 'restore'])->name('users.restore');

        Route::get('assignments', [AssignmentController::class, 'index'])->name('assignments.index');
        Route::post('assignments', [AssignmentController::class, 'store'])->name('assignments.store');
        Route::post('assignments/swap', [AssignmentController::class, 'swap'])->name('assignments.swap');

        Route::middleware('cache.headers:no_store;max_age=0;private')->group(function (): void {
            Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
            Route::get('reports/pdf', [ReportController::class, 'pdf'])->name('reports.pdf');
            Route::get('reports/csv', [ReportController::class, 'csv'])->name('reports.csv');
            Route::get('audit', [AuditEventController::class, 'index'])->name('audit.index');
            Route::get('audit/{auditEvent}', [AuditEventController::class, 'show'])->name('audit.show');
        });
    });
});
