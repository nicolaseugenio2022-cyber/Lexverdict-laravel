<?php

namespace App\Domain\Cases\Actions;

use App\Domain\Cases\Enums\SubpoenaStatus;
use App\Domain\Cases\Exceptions\CaseDataInvariantException;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\LegalCase;
use App\Models\SubpoenaDecision;
use App\Models\SubpoenaRevision;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Support\Facades\DB;

class DecideSubpoena
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function approve(LegalCase $case, User $reviewer): SubpoenaDecision
    {
        return $this->decide($case, $reviewer, SubpoenaStatus::Approved, null);
    }

    public function deny(LegalCase $case, User $reviewer, string $comment): SubpoenaDecision
    {
        return $this->decide($case, $reviewer, SubpoenaStatus::Denied, $comment);
    }

    private function decide(LegalCase $case, User $reviewer, SubpoenaStatus $decision, ?string $comment): SubpoenaDecision
    {
        return DB::transaction(function () use ($case, $reviewer, $decision, $comment): SubpoenaDecision {
            /** @var LegalCase $case */
            $case = LegalCase::query()->lockForUpdate()->findOrFail($case->id);

            if (! $reviewer->is_active || ! $reviewer->hasRole(StaffRole::Prosecutor)) {
                throw new CaseDataInvariantException('Only the assigned Prosecutor may review this subpoena.');
            }

            if ($case->assigned_prosecutor_id !== $reviewer->id) {
                throw new CaseDataInvariantException('Only the assigned Prosecutor may review this subpoena.');
            }

            if ($case->created_by_user_id === $reviewer->id) {
                throw new CaseDataInvariantException('The subpoena creator may not review their own submission.');
            }

            if ($this->subpoenaStatusValue($case->subpoena_status) !== SubpoenaStatus::Pending->value) {
                throw new CaseDataInvariantException('Only a Pending subpoena may be approved or denied.');
            }

            $revisionExists = SubpoenaRevision::query()
                ->where('case_id', $case->id)
                ->where('revision_number', $case->revision_number)
                ->exists();

            if (! $revisionExists) {
                throw new CaseDataInvariantException('The current subpoena revision is unavailable for review.');
            }

            $normalizedComment = $comment === null ? null : trim($comment);

            if ($decision === SubpoenaStatus::Denied && $normalizedComment === '') {
                throw new CaseDataInvariantException('Comment is required to deny.');
            }

            $case->update(['subpoena_status' => $decision->value]);

            $record = SubpoenaDecision::create([
                'case_id' => $case->id,
                'revision_number' => $case->revision_number,
                'decision' => $decision->value,
                'comment_type' => $decision === SubpoenaStatus::Denied ? 'Subpoena' : null,
                'comment' => $decision === SubpoenaStatus::Denied ? $normalizedComment : null,
                'decided_by' => $reviewer->id,
                'decided_at' => now(),
            ]);

            $this->audit->record(
                $decision === SubpoenaStatus::Approved ? 'subpoena.approved' : 'subpoena.denied',
                $reviewer,
                LegalCase::class,
                $case->id,
                [
                    'docket_number' => $case->docket_number,
                    'revision_number' => $case->revision_number,
                    'from' => SubpoenaStatus::Pending->value,
                    'to' => $decision->value,
                ],
            );

            return $record;
        });
    }

    private function subpoenaStatusValue(mixed $status): string
    {
        return $status instanceof SubpoenaStatus ? $status->value : (string) $status;
    }
}
