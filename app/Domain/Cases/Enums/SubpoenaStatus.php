<?php

namespace App\Domain\Cases\Enums;

enum SubpoenaStatus: string
{
    case Pending = 'Pending';
    case Approved = 'Approved';
    case Denied = 'Denied';
}
