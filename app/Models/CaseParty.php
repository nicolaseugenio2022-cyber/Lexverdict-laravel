<?php

namespace App\Models;

use App\Domain\Cases\Enums\PartyRole;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseParty extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'case_id',
        'person_id',
        'role',
        'position',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'date_of_birth',
        'sex',
        'street',
        'barangay',
        'municipality',
        'province',
        'region',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'position' => 'integer',
            'role' => PartyRole::class,
        ];
    }

    /**
     * @return BelongsTo<LegalCase, $this>
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class, 'case_id');
    }

    /**
     * @return BelongsTo<Person, $this>
     */
    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }
}
