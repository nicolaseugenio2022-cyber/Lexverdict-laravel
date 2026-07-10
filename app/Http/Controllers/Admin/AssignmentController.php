<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Identity\Actions\ManageAssignment;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Identity\Exceptions\IdentityInvariantException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAssignmentRequest;
use App\Http\Requests\Admin\SwapAssignmentRequest;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AssignmentController extends Controller
{
    public function index(): Response
    {
        $this->authorize('manage-assignments');

        return Inertia::render('Admin/Assignments/Index', [
            'assignments' => ProsecutorSecretaryAssignment::query()
                ->with(['prosecutor.staffProfile', 'secretary.staffProfile'])
                ->orderBy('assigned_at')
                ->get()
                ->map(function (ProsecutorSecretaryAssignment $assignment): array {
                    $prosecutor = $assignment->prosecutor;
                    $secretary = $assignment->secretary;

                    return [
                        'prosecutor_user_id' => $assignment->prosecutor_user_id,
                        'secretary_user_id' => $assignment->secretary_user_id,
                        'assigned_at' => $assignment->assigned_at ? Carbon::parse($assignment->assigned_at)->toISOString() : null,
                        'reason' => $assignment->reason,
                        'prosecutor_name' => $prosecutor->staffProfile?->displayName() ?? $prosecutor->username,
                        'secretary_name' => $secretary->staffProfile?->displayName() ?? $secretary->username,
                    ];
                }),
            'prosecutors' => $this->staffOptions(StaffRole::Prosecutor),
            'secretaries' => $this->staffOptions(StaffRole::Secretary),
        ]);
    }

    public function store(StoreAssignmentRequest $request, ManageAssignment $assignments): RedirectResponse
    {
        try {
            $assignments->assign(
                User::findOrFail($request->validated('prosecutor_user_id')),
                User::findOrFail($request->validated('secretary_user_id')),
                $request->user(),
                $request->validated('reason'),
            );
        } catch (IdentityInvariantException $exception) {
            return back()->withErrors(['assignment' => $exception->getMessage()])->withInput();
        }

        return redirect()->route('admin.assignments.index');
    }

    public function swap(SwapAssignmentRequest $request, ManageAssignment $assignments): RedirectResponse
    {
        try {
            $assignments->swap(
                User::findOrFail($request->validated('first_prosecutor_user_id')),
                User::findOrFail($request->validated('second_prosecutor_user_id')),
                $request->user(),
                $request->validated('reason'),
            );
        } catch (IdentityInvariantException $exception) {
            return back()->withErrors(['assignment' => $exception->getMessage()])->withInput();
        }

        return redirect()->route('admin.assignments.index');
    }

    /**
     * @return list<array{id: string, label: string, is_active: bool}>
     */
    private function staffOptions(StaffRole $role): array
    {
        return User::query()
            ->with('staffProfile')
            ->where('role', $role->value)
            ->where('is_active', true)
            ->orderBy('username')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'label' => $user->staffProfile?->displayName() ?: $user->username,
                'is_active' => $user->is_active,
            ])->values()->all();
    }
}
