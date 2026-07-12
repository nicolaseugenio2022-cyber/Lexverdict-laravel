<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class GeneratedDocument extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = [
        'case_id', 'document_type', 'template_version', 'version', 'render_payload', 'disk', 'storage_path',
        'sha256', 'byte_size', 'requested_by', 'requested_at', 'generated_at', 'failed_at',
    ];

    /** @var list<string> */
    protected $hidden = ['render_payload'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'byte_size' => 'integer',
            'requested_at' => 'datetime',
            'generated_at' => 'datetime',
            'failed_at' => 'datetime',
            'render_payload' => 'encrypted:array',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (GeneratedDocument $document): void {
            if ($document->getOriginal('generated_at') !== null || $document->getOriginal('failed_at') !== null) {
                throw new LogicException('Generated document metadata is immutable.');
            }
        });
        static::deleting(fn (): never => throw new LogicException('Generated document history cannot be removed.'));
    }

    /** @return BelongsTo<LegalCase, $this> */
    public function case(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class, 'case_id');
    }

    /** @return BelongsTo<User, $this> */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
