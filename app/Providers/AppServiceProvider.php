<?php

namespace App\Providers;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('manage-users', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('manage-assignments', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('view-audit', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('view-reports', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('process-server-scope', fn (User $user): bool => $user->hasRole(StaffRole::ProcessServer));
    }
}
