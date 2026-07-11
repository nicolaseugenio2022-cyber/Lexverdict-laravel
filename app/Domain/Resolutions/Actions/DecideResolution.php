<?php

namespace App\Domain\Resolutions\Actions;

use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Enums\ResolutionStatus;
use App\Domain\Resolutions\Exceptions\ResolutionInvariantException;
use App\Models\Resolution;
use App\Models\ResolutionDecision;
use App\Models\ResolutionRevision;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DecideResolution
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function approve(Resolution $resolution, User $reviewer, int $expectedRevision, ?Request $request = null): ResolutionDecision
    {
        return $this->decide($resolution, $reviewer, $expectedRevision, ResolutionStatus::Approved, null, $request);
    }

    public function deny(Resolution $resolution, User $reviewer, int $expectedRevision, string $comment, ?Request $request = null): ResolutionDecision
    {
        return $this->decide($resolution, $reviewer, $expectedRevision, ResolutionStatus::Denied, $comment, $request);
    }

    private function decide(Resolution $resolution, User $reviewer, int $expectedRevision, ResolutionStatus $decision, ?string $comment, ?Request $request): ResolutionDecision
    {
        return DB::transaction(function () use ($resolution, $reviewer, $expectedRevision, $decision, $comment, $request): ResolutionDecision {
            /** @var User $reviewer */
            $reviewer = User::query()->lockForUpdate()->findOrFail($reviewer->id);
            /** @var Resolution $resolution */
            $resolution = Resolution::query()->lockForUpdate()->findOrFail($resolution->id);

            if (! $reviewer->is_active || ! $reviewer->hasRole(StaffRole::Superuser)) {
                throw new ResolutionInvariantException('Only Administrator may review a Resolution.');
            }

            if ($this->statusValue($resolution->status) !== ResolutionStatus::Pending->value) {
                throw new ResolutionInvariantException('Only a Pending Resolution may be approved or denied.');
            }

            if ($expectedRevision !== $resolution->revision_number) {
                throw new ResolutionInvariantException('This Resolution has a newer revision. Reload and review it before deciding.');
            }

            if (! ResolutionRevision::query()->where('resolution_id', $resolution->id)->where('revision_number', $resolution->revision_number)->exists()) {
                throw new ResolutionInvariantException('The current Resolution revision is unavailable for review.');
            }

            $normalizedComment = $comment === null ? null : trim($comment);
            if ($decision === ResolutionStatus::Denied && $normalizedComment === '') {
                throw new ResolutionInvariantException('Comment is required to deny the Resolution.');
            }

            $changes = ['status' => $decision->value];
            if ($decision === ResolutionStatus::Approved) {
                $changes['verdict_date'] = today()->toDateString();
            }
            $resolution->update($changes);

            $record = ResolutionDecision::create([
                'resolution_id' => $resolution->id,
                'revision_number' => $resolution->revision_number,
                'decision' => $decision->value,
                'comment_type' => $decision === ResolutionStatus::Denied ? 'Resolution' : null,
                'comment' => $decision === ResolutionStatus::Denied ? $normalizedComment : null,
                'decided_by' => $reviewer->id,
                'decided_at' => now(),
            ]);
            $resolution->update(['current_decision_id' => $record->id]);

            $this->audit->record(
                $decision === ResolutionStatus::Approved ? 'resolution.approved' : 'resolution.denied',
                $reviewer,
                Resolution::class,
                $resolution->id,
                [
                    'case_id' => $resolution->case_id,
                    'revision_number' => $resolution->revision_number,
                    'from' => ResolutionStatus::Pending->value,
                    'to' => $decision->value,
                ],
                $request,
            );

            return $record;
        });
    }

    private function statusValue(mixed $status): string
    {
        return $status instanceof ResolutionStatus ? $status->value : (string) $status;
    }
}
