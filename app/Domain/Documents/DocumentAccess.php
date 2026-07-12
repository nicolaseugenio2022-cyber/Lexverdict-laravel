<?php

namespace App\Domain\Documents;

use App\Domain\Cases\Actions\CaseAccess;
use App\Domain\Identity\Enums\StaffRole;
use App\Models\GeneratedDocument;
use App\Models\LegalCase;
use App\Models\User;

class DocumentAccess
{
    public function __construct(private readonly CaseAccess $cases) {}

    public function canGenerate(User $user, LegalCase $case): bool
    {
        return $user->is_active
            && ($user->hasRole(StaffRole::Superuser)
                || ($user->hasRole(StaffRole::Secretary) && $this->cases->canView($user, $case)))
            && $case->hearing_date_1 !== null
            && $case->pin_document_secret !== null;
    }

    public function canView(User $user, GeneratedDocument $document): bool
    {
        return $document->case !== null && $this->canGenerate($user, $document->case);
    }
}
