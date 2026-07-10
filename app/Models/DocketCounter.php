<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DocketCounter extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'region',
        'office',
        'type_code',
        'year',
        'month',
        'last_serial',
    ];
}
