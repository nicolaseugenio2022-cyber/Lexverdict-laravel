<?php

namespace App\Domain\Cases\Enums;

enum PartyRole: string
{
    case Complainant = 'Complainant';
    case Respondent = 'Respondent';
}
