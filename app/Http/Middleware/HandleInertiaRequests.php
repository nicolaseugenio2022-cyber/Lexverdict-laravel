<?php

namespace App\Http\Middleware;

use App\Domain\Identity\Enums\StaffRole;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'username' => $user->username,
                    'role' => $user->role,
                    'role_label' => $user->role()->label(),
                    'is_active' => $user->is_active,
                    'name' => $user->staffProfile?->displayName(),
                ] : null,
                'can' => [
                    'manage_users' => $user?->can('manage-users') ?? false,
                    'manage_assignments' => $user?->can('manage-assignments') ?? false,
                    'process_server_scope' => $user?->can('process-server-scope') ?? false,
                    'case_management' => $user !== null && ! $user->can('process-server-scope'),
                    'review_subpoenas' => $user?->hasRole(StaffRole::Prosecutor) ?? false,
                    'review_resolutions' => $user?->hasRole(StaffRole::Superuser) ?? false,
                    'view_reports' => $user?->can('view-reports') ?? false,
                    'view_audit' => $user?->can('view-audit') ?? false,
                ],
            ],
            'flash' => [
                'errors' => session('errors')?->getBag('default')->getMessages() ?? (object) [],
            ],
        ];
    }
}
