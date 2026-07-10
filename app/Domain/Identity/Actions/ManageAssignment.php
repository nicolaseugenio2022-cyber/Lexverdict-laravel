<?php

namespace App\Domain\Identity\Actions;

use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Identity\Exceptions\IdentityInvariantException;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\ProsecutorSecretaryAssignmentHistory;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Support\Facades\DB;

class ManageAssignment
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function assign(User $prosecutor, User $secretary, User $actor, ?string $reason = null): ProsecutorSecretaryAssignment
    {
        return DB::transaction(function () use ($prosecutor, $secretary, $actor, $reason): ProsecutorSecretaryAssignment {
            $prosecutor = User::query()->lockForUpdate()->findOrFail($prosecutor->id);
            $secretary = User::query()->lockForUpdate()->findOrFail($secretary->id);

            $this->assertPairable($prosecutor, $secretary);

            $existingForProsecutor = ProsecutorSecretaryAssignment::query()
                ->where('prosecutor_user_id', $prosecutor->id)
                ->lockForUpdate()
                ->first();
            $existingForSecretary = ProsecutorSecretaryAssignment::query()
                ->where('secretary_user_id', $secretary->id)
                ->lockForUpdate()
                ->first();

            if ($existingForSecretary && $existingForSecretary->prosecutor_user_id !== $prosecutor->id) {
                throw new IdentityInvariantException('Secretary is already assigned to another Prosecutor.');
            }

            if ($existingForProsecutor && $existingForProsecutor->secretary_user_id !== $secretary->id) {
                $oldSecretary = User::query()->lockForUpdate()->findOrFail($existingForProsecutor->secretary_user_id);
                if ($oldSecretary->is_active) {
                    throw new IdentityInvariantException('Replacing this Secretary would leave an active Secretary unpaired.');
                }

                $this->closeHistory($prosecutor->id, $existingForProsecutor->secretary_user_id, $actor, $reason);
            }

            $assignment = ProsecutorSecretaryAssignment::query()->updateOrCreate(
                ['prosecutor_user_id' => $prosecutor->id],
                [
                    'secretary_user_id' => $secretary->id,
                    'assigned_by' => $actor->id,
                    'assigned_at' => now(),
                    'reason' => $reason,
                ],
            );

            $this->openHistory($prosecutor->id, $secretary->id, $actor, $reason);
            $this->assertMandatoryPairsComplete();

            $this->audit->record('assignment.changed', $actor, User::class, $prosecutor->id, [
                'prosecutor_user_id' => $prosecutor->id,
                'secretary_user_id' => $secretary->id,
                'reason' => $reason,
            ]);

            return $assignment;
        });
    }

    public function swap(User $firstProsecutor, User $secondProsecutor, User $actor, ?string $reason = null): void
    {
        DB::transaction(function () use ($firstProsecutor, $secondProsecutor, $actor, $reason): void {
            $first = ProsecutorSecretaryAssignment::query()
                ->where('prosecutor_user_id', $firstProsecutor->id)
                ->lockForUpdate()
                ->firstOrFail();
            $second = ProsecutorSecretaryAssignment::query()
                ->where('prosecutor_user_id', $secondProsecutor->id)
                ->lockForUpdate()
                ->firstOrFail();

            $firstSecretaryId = $first->secretary_user_id;
            $secondSecretaryId = $second->secretary_user_id;

            $this->closeHistory($first->prosecutor_user_id, $firstSecretaryId, $actor, $reason);
            $this->closeHistory($second->prosecutor_user_id, $secondSecretaryId, $actor, $reason);

            $first->delete();
            $second->delete();

            ProsecutorSecretaryAssignment::create([
                'prosecutor_user_id' => $first->prosecutor_user_id,
                'secretary_user_id' => $secondSecretaryId,
                'assigned_by' => $actor->id,
                'assigned_at' => now(),
                'reason' => $reason,
            ]);

            ProsecutorSecretaryAssignment::create([
                'prosecutor_user_id' => $second->prosecutor_user_id,
                'secretary_user_id' => $firstSecretaryId,
                'assigned_by' => $actor->id,
                'assigned_at' => now(),
                'reason' => $reason,
            ]);

            $this->openHistory($first->prosecutor_user_id, $secondSecretaryId, $actor, $reason);
            $this->openHistory($second->prosecutor_user_id, $firstSecretaryId, $actor, $reason);
            $this->assertMandatoryPairsComplete();

            $this->audit->record('assignment.swapped', $actor, User::class, $first->prosecutor_user_id, [
                'first_prosecutor_user_id' => $first->prosecutor_user_id,
                'second_prosecutor_user_id' => $second->prosecutor_user_id,
                'reason' => $reason,
            ]);
        });
    }

    public function assertMandatoryPairsComplete(): void
    {
        $unpairedProsecutorExists = User::query()
            ->where('role', StaffRole::Prosecutor->value)
            ->where('is_active', true)
            ->whereDoesntHave('prosecutorAssignment')
            ->exists();

        if ($unpairedProsecutorExists) {
            throw new IdentityInvariantException('Every active Prosecutor must have exactly one Secretary.');
        }

        $unpairedSecretaryExists = User::query()
            ->where('role', StaffRole::Secretary->value)
            ->where('is_active', true)
            ->whereDoesntHave('secretaryAssignment')
            ->exists();

        if ($unpairedSecretaryExists) {
            throw new IdentityInvariantException('Every active Secretary must have exactly one Prosecutor.');
        }
    }

    private function assertPairable(User $prosecutor, User $secretary): void
    {
        if (! $prosecutor->hasRole(StaffRole::Prosecutor) || ! $secretary->hasRole(StaffRole::Secretary)) {
            throw new IdentityInvariantException('Assignment requires one Prosecutor and one Secretary.');
        }

        if (! $prosecutor->is_active || ! $secretary->is_active) {
            throw new IdentityInvariantException('Assignment requires active staff.');
        }
    }

    private function closeHistory(string $prosecutorId, string $secretaryId, User $actor, ?string $reason): void
    {
        ProsecutorSecretaryAssignmentHistory::query()
            ->where('prosecutor_user_id', $prosecutorId)
            ->where('secretary_user_id', $secretaryId)
            ->whereNull('effective_until')
            ->update([
                'effective_until' => now(),
                'changed_by' => $actor->id,
                'reason' => $reason,
            ]);
    }

    private function openHistory(string $prosecutorId, string $secretaryId, User $actor, ?string $reason): void
    {
        ProsecutorSecretaryAssignmentHistory::create([
            'prosecutor_user_id' => $prosecutorId,
            'secretary_user_id' => $secretaryId,
            'effective_from' => now(),
            'changed_by' => $actor->id,
            'reason' => $reason,
        ]);
    }
}
