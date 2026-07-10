<?php

use App\Http\Controllers\Admin\AssignmentController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\CaseController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('baseline');

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.store');
});

Route::middleware(['auth', 'active'])->group(function (): void {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::resource('cases', CaseController::class)->except(['destroy']);

    Route::prefix('admin')->name('admin.')->group(function (): void {
        Route::resource('users', UserController::class)->except(['show', 'destroy']);
        Route::patch('users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
        Route::patch('users/{user}/restore', [UserController::class, 'restore'])->name('users.restore');

        Route::get('assignments', [AssignmentController::class, 'index'])->name('assignments.index');
        Route::post('assignments', [AssignmentController::class, 'store'])->name('assignments.store');
        Route::post('assignments/swap', [AssignmentController::class, 'swap'])->name('assignments.swap');
    });
});
