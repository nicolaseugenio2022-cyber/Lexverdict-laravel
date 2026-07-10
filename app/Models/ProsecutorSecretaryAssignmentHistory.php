<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ProsecutorSecretaryAssignmentHistory extends Model
{
    use HasUuids;

    protected $table = 'prosecutor_secretary_assignment_history';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'prosecutor_user_id',
        'secretary_user_id',
        'effective_from',
        'effective_until',
        'changed_by',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'effective_from' => 'datetime',
            'effective_until' => 'datetime',
        ];
    }
}
