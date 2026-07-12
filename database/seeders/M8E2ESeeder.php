<?php

namespace Database\Seeders;

use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Actions\DecideSubpoena;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Actions\DecideResolution;
use App\Domain\Resolutions\Actions\SubmitResolution;
use App\Models\Offense;
use App\Models\ProsecutorSecretaryAssignment;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class M8E2ESeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('testing')) {
            throw new RuntimeException('The M8 browser fixture may run only in the testing environment.');
        }

        DB::transaction(function (): void {
            $admin = $this->staff('e2e_admin', StaffRole::Superuser, 'Alex', 'Administrator');
            $prosecutor = $this->staff('e2e_prosecutor', StaffRole::Prosecutor, 'Paolo', 'Prosecutor');
            $secretary = $this->staff('e2e_secretary', StaffRole::Secretary, 'Sofia', 'Secretary');
            $this->staff('e2e_process_server', StaffRole::ProcessServer, 'Pio', 'Server');

            ProsecutorSecretaryAssignment::create([
                'prosecutor_user_id' => $prosecutor->id,
                'secretary_user_id' => $secretary->id,
                'assigned_by' => $admin->id,
                'assigned_at' => now(),
            ]);

            $offense = Offense::create([
                'name' => 'Qualified Theft',
                'normalized_name' => 'qualified theft',
                'law_reference' => null,
                'is_active' => true,
            ]);

            $created = app(CreateCase::class)->create([
                'date' => '2026-07-10',
                'hearing_date_1' => '2026-07-21 09:30:00',
                'hearing_date_2' => '2026-07-22 09:30:00',
                'police_station' => 'Cabanatuan City Police Station',
                'offense_ids' => [$offense->id],
                'parties' => [
                    $this->party('Complainant', 'Camille', 'Complainant', 'Female'),
                    $this->party('Respondent', 'Ramon', 'Respondent', 'Male'),
                ],
            ], $secretary);

            $case = $created['case'];
            $case->update([
                'pin_hash' => Hash::make('246810'),
                'pin_document_secret' => '246810',
            ]);
            app(DecideSubpoena::class)->approve($case->refresh(), $prosecutor, 1);
            $resolution = app(SubmitResolution::class)->create($case->refresh(), [
                'verdict' => 'For Filing',
                'court' => 'RTC Cabanatuan',
            ], $secretary);
            app(DecideResolution::class)->approve($resolution, $admin, 1);
        });
    }

    private function staff(string $username, StaffRole $role, string $firstName, string $lastName): User
    {
        $user = User::create([
            'username' => $username,
            'password' => Hash::make('E2E-only-password'),
            'role' => $role->value,
            'is_active' => true,
        ]);
        StaffProfile::create([
            'user_id' => $user->id,
            'first_name' => $firstName,
            'last_name' => $lastName,
        ]);

        return $user;
    }

    /** @return array<string, string> */
    private function party(string $role, string $firstName, string $lastName, string $sex): array
    {
        return [
            'role' => $role,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => '1990-01-01',
            'sex' => $sex,
            'street' => 'Maharlika Street',
            'barangay' => 'San Josef Sur',
            'municipality' => 'Cabanatuan City',
            'province' => 'Nueva Ecija',
            'region' => 'III',
        ];
    }
}
