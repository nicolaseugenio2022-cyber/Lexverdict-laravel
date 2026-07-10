<?php

namespace Tests\Feature;

use Tests\TestCase;

class ArchitectureSmokeTest extends TestCase
{
    public function test_root_redirects_to_authenticated_dashboard_boundary(): void
    {
        $this->get(route('baseline'))->assertRedirect('/dashboard');
    }
}
