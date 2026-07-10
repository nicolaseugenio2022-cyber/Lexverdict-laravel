<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Identity\Actions\ManageStaffUser;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Identity\Exceptions\IdentityInvariantException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        $this->authorize('manage-users');

        return Inertia::render('Admin/Users/Index', [
            'users' => User::query()
                ->with(['staffProfile', 'prosecutorProfile', 'prosecutorAssignment', 'secretaryAssignment'])
                ->orderBy('username')
                ->get()
                ->map(fn (User $user): array => $this->userPayload($user)),
            'roles' => collect(StaffRole::cases())->map(fn (StaffRole $role): array => [
                'value' => $role->value,
                'label' => $role->label(),
            ])->values(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('manage-users');

        return Inertia::render('Admin/Users/Form', [
            'mode' => 'create',
            'roles' => $this->roles(),
            'user' => null,
        ]);
    }

    public function store(StoreUserRequest $request, ManageStaffUser $users): RedirectResponse
    {
        try {
            $users->create($request->validated(), $request->user());
        } catch (IdentityInvariantException $exception) {
            return back()->withErrors(['identity' => $exception->getMessage()])->withInput();
        }

        return redirect()->route('admin.users.index');
    }

    public function edit(User $user): Response
    {
        $this->authorize('manage-users');
        $user->load(['staffProfile', 'prosecutorProfile']);

        return Inertia::render('Admin/Users/Form', [
            'mode' => 'edit',
            'roles' => $this->roles(),
            'user' => $this->userPayload($user),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user, ManageStaffUser $users): RedirectResponse
    {
        try {
            $users->update($user, $request->validated(), $request->user());
        } catch (IdentityInvariantException $exception) {
            return back()->withErrors(['identity' => $exception->getMessage()])->withInput();
        }

        return redirect()->route('admin.users.index');
    }

    public function deactivate(User $user, ManageStaffUser $users): RedirectResponse
    {
        $this->authorize('manage-users');

        try {
            $users->deactivate($user, request()->user());
        } catch (IdentityInvariantException $exception) {
            return back()->withErrors(['identity' => $exception->getMessage()]);
        }

        return redirect()->route('admin.users.index');
    }

    public function restore(User $user, ManageStaffUser $users): RedirectResponse
    {
        $this->authorize('manage-users');

        try {
            $users->restore($user, request()->user());
        } catch (IdentityInvariantException $exception) {
            return back()->withErrors(['identity' => $exception->getMessage()]);
        }

        return redirect()->route('admin.users.index');
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function roles(): array
    {
        return collect(StaffRole::cases())->map(fn (StaffRole $role): array => [
            'value' => $role->value,
            'label' => $role->label(),
        ])->values()->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
            'role_label' => $user->role()->label(),
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at ? Carbon::parse($user->last_login_at)->toISOString() : null,
            'staff_profile' => $user->staffProfile,
            'prosecutor_profile' => $user->prosecutorProfile,
            'has_assignment' => $user->prosecutorAssignment !== null || $user->secretaryAssignment !== null,
        ];
    }
}
