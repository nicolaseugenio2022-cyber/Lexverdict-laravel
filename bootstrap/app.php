<?php

use App\Http\Controllers\ReadinessController;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            Route::get('/health/ready', ReadinessController::class)
                ->middleware([SecurityHeaders::class, 'throttle:30,1'])
                ->name('health.ready');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $trustedProxyValue = $_SERVER['TRUSTED_PROXIES'] ?? $_ENV['TRUSTED_PROXIES'] ?? getenv('TRUSTED_PROXIES');
        $trustedProxies = array_values(array_filter(array_map('trim', explode(',', (string) $trustedProxyValue))));
        if ($trustedProxies !== []) {
            $middleware->trustProxies(at: $trustedProxies);
        }
        $middleware->web(append: [
            HandleInertiaRequests::class,
            SecurityHeaders::class,
        ]);
        $middleware->alias([
            'active' => EnsureUserIsActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash([
            'current_password',
            'password',
            'password_confirmation',
            'pin',
        ]);
    })->create();
