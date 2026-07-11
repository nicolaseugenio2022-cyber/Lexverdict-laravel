<?php

namespace App\Domain\Resolutions\Actions;

use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Enums\ResolutionVerdict;
use App\Domain\Resolutions\Exceptions\ResolutionInvariantException;
use App\Models\LegalCase;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\Resolution;
use App\Models\ResolutionRevision;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubmitResolution
{
    public function __construct(private readonly AuditRecorder $audit) {}

    /** @param array<string, mixed> $data */
    public function create(LegalCase $case, array $data, User $actor, ?Request $request = null): Resolution
    {
        return DB::transaction(function () use ($case, $data, $actor, $request): Resolution {
            /** @var User $actor */
            $actor = User::query()->lockForUpdate()->findOrFail($actor->id);
            /** @var LegalCase $case */
            $case = LegalCase::query()->lockForUpdate()->findOrFail($case->id);
            $this->assertActorCanSubmit($actor, $case);

            if (Resolution::query()->where('case_id', $case->id)->exists()) {
                throw new ResolutionInvariantException('This case already has a Resolution.');
            }

            [$verdict, $court] = $this->validatedVerdictAndCourt($data);
            $verdictDate = today()->toDateString();

            $resolution = Resolution::create([
                'case_id' => $case->id,
                'verdict' => $verdict->value,
                'court' => $court,
                'verdict_date' => $verdictDate,
                'status' => ResolutionStatus::Pending->value,
                'revision_number' => 1,
                'created_by_user_id' => $actor->id,
            ]);

            $revision = $this->createRevision($resolution, $verdict, $court, $verdictDate, $actor);
            $resolution->update(['current_revision_id' => $revision->id]);
            $this->audit->record('resolution.submitted', $actor, Resolution::class, $resolution->id, [
                'case_id' => $case->id,
                'docket_number' => $case->docket_number,
                'revision_number' => 1,
                'verdict' => $verdict->value,
                'status' => ResolutionStatus::Pending->value,
            ], $request);

            return $resolution;
        });
    }

    /** @param array<string, mixed> $data */
    public function revise(Resolution $resolution, array $data, User $actor, int $expectedRevision, ?Request $request = null): Resolution
    {
        return DB::transaction(function () use ($resolution, $data, $actor, $expectedRevision, $request): Resolution {
            /** @var User $actor */
            $actor = User::query()->lockForUpdate()->findOrFail($actor->id);
            /** @var LegalCase $case */
            $case = LegalCase::query()->lockForUpdate()->findOrFail($resolution->case_id);
            /** @var Resolution $resolution */
            $resolution = Resolution::query()->lockForUpdate()->findOrFail($resolution->id);
            $this->assertActorCanSubmit($actor, $case);

            if ($expectedRevision !== $resolution->revision_number) {
                throw new ResolutionInvariantException('This Resolution has a newer revision. Reload it before saving.');
            }

            $status = $this->statusValue($resolution->status);
            if (! in_array($status, [ResolutionStatus::Pending->value, ResolutionStatus::Denied->value], true)) {
                throw new ResolutionInvariantException('An Approved Resolution cannot be revised.');
            }

            [$verdict, $court] = $this->validatedVerdictAndCourt($data);
            $verdictDate = today()->toDateString();
            $nextRevision = $resolution->revision_number + 1;

            $resolution->update([
                'verdict' => $verdict->value,
                'court' => $court,
                'verdict_date' => $verdictDate,
                'status' => ResolutionStatus::Pending->value,
                'revision_number' => $nextRevision,
                'current_decision_id' => null,
            ]);

            $revision = $this->createRevision($resolution, $verdict, $court, $verdictDate, $actor);
            $resolution->update(['current_revision_id' => $revision->id]);
            $this->audit->record('resolution.revised', $actor, Resolution::class, $resolution->id, [
                'case_id' => $case->id,
                'docket_number' => $case->docket_number,
                'revision_number' => $nextRevision,
                'verdict' => $verdict->value,
                'status' => ResolutionStatus::Pending->value,
            ], $request);

            return $resolution;
        });
    }

    private function assertActorCanSubmit(User $actor, LegalCase $case): void
    {
        if (! $actor->is_active || $this->subpoenaStatusValue($case->subpoena_status) !== SubpoenaStatus::Approved->value) {
            throw new ResolutionInvariantException('A Resolution may be submitted only for an Approved Subpoena.');
        }

        if ($actor->hasRole(StaffRole::Superuser)) {
            return;
        }

        if (! $actor->hasRole(StaffRole::Secretary)) {
            throw new ResolutionInvariantException('You are not authorized to submit this Resolution.');
        }

        $assignedProsecutorId = ProsecutorSecretaryAssignment::query()
            ->where('secretary_user_id', $actor->id)
            ->lockForUpdate()
            ->value('prosecutor_user_id');

        if ($assignedProsecutorId !== $case->assigned_prosecutor_id) {
            throw new ResolutionInvariantException('You are not authorized to submit this Resolution.');
        }
    }

    /** @param array<string, mixed> $data
     * @return array{0: ResolutionVerdict, 1: string|null}
     */
    private function validatedVerdictAndCourt(array $data): array
    {
        $verdict = ResolutionVerdict::tryFrom((string) ($data['verdict'] ?? ''));
        if ($verdict === null || ! in_array($verdict->value, ResolutionVerdict::submittableValues(), true)) {
            throw new ResolutionInvariantException("The Resolution verdict must be 'For Filing' or 'Dismissed'.");
        }

        $court = trim((string) ($data['court'] ?? ''));
        if ($verdict === ResolutionVerdict::ForFiling && $court === '') {
            throw new ResolutionInvariantException("Court is required for a 'For Filing' Resolution.");
        }

        return [$verdict, $verdict === ResolutionVerdict::ForFiling ? $court : null];
    }

    private function createRevision(Resolution $resolution, ResolutionVerdict $verdict, ?string $court, string $verdictDate, User $actor): ResolutionRevision
    {
        return ResolutionRevision::create([
            'resolution_id' => $resolution->id,
            'revision_number' => $resolution->revision_number,
            'verdict' => $verdict->value,
            'court' => $court,
            'verdict_date' => $verdictDate,
            'submitted_by' => $actor->id,
            'submitted_at' => now(),
        ]);
    }

    private function subpoenaStatusValue(mixed $status): string
    {
        return $status instanceof SubpoenaStatus ? $status->value : (string) $status;
    }

    private function statusValue(mixed $status): string
    {
        return $status instanceof ResolutionStatus ? $status->value : (string) $status;
    }
}
