<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProsecutorSecretaryAssignment extends Model
{
    protected $primaryKey = 'prosecutor_user_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'prosecutor_user_id',
        'secretary_user_id',
        'assigned_by',
        'assigned_at',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function prosecutor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prosecutor_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function secretary(): BelongsTo
    {
        return $this->belongsTo(User::class, 'secretary_user_id');
    }
}
