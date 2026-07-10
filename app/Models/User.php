<?php

namespace App\Models;

use App\Domain\Identity\Enums\StaffRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUuids, Notifiable;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'username',
        'password',
        'role',
        'is_active',
        'last_login_at',
        'deactivated_at',
        'deactivated_by',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'deactivated_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * @return HasOne<StaffProfile, $this>
     */
    public function staffProfile(): HasOne
    {
        return $this->hasOne(StaffProfile::class);
    }

    /**
     * @return HasOne<ProsecutorProfile, $this>
     */
    public function prosecutorProfile(): HasOne
    {
        return $this->hasOne(ProsecutorProfile::class);
    }

    /**
     * @return HasOne<ProsecutorSecretaryAssignment, $this>
     */
    public function prosecutorAssignment(): HasOne
    {
        return $this->hasOne(ProsecutorSecretaryAssignment::class, 'prosecutor_user_id');
    }

    /**
     * @return HasOne<ProsecutorSecretaryAssignment, $this>
     */
    public function secretaryAssignment(): HasOne
    {
        return $this->hasOne(ProsecutorSecretaryAssignment::class, 'secretary_user_id');
    }

    public function role(): StaffRole
    {
        return StaffRole::from($this->role);
    }

    public function hasRole(StaffRole $role): bool
    {
        return $this->role === $role->value;
    }

    public function isAdministrator(): bool
    {
        return $this->hasRole(StaffRole::Superuser);
    }
}
