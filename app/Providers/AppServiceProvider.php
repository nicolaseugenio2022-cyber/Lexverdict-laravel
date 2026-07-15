<?php

namespace App\Providers;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\Offense;
use App\Models\User;
use App\Policies\OffensePolicy;
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
        Gate::policy(Offense::class, OffensePolicy::class);
        Gate::define('view-dashboard', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('manage-users', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('manage-assignments', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('view-audit', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('view-reports', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('process-server-scope', fn (User $user): bool => $user->hasRole(StaffRole::ProcessServer));
        Gate::define('view-process-server-cases', fn (User $user): bool => $user->is_active && $user->hasRole(StaffRole::ProcessServer));
        Gate::define('manage-offenses', fn (User $user): bool => $user->hasRole(StaffRole::Superuser));
        Gate::define('view-secretary-verification', fn (User $user): bool => $user->is_active && $user->hasRole(StaffRole::Secretary));
    }
}
