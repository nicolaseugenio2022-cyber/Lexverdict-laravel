<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Person extends Model
{
    use HasUuids;

    protected $table = 'persons';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'date_of_birth',
        'sex',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    /**
     * @return HasMany<CaseParty, $this>
     */
    public function caseParties(): HasMany
    {
        return $this->hasMany(CaseParty::class);
    }
}
