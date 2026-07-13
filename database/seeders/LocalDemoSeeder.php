<?php

namespace Database\Seeders;

use App\Domain\Cases\Actions\CreateCase;
use App\Domain\Cases\Actions\DecideSubpoena;
use App\Domain\Cases\Actions\ManageOffense;
use App\Domain\Identity\Actions\ManageAssignment;
use App\Domain\Identity\Enums\StaffRole;
use App\Domain\Resolutions\Actions\DecideResolution;
use App\Domain\Resolutions\Actions\SubmitResolution;
use App\Models\LegalCase;
use App\Models\Offense;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class LocalDemoSeeder extends Seeder
{
    private const PASSWORD = 'LocalDemo!2026';

    public function run(): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('The localhost demo fixture may run only in the local environment.');
        }

        if (User::query()->exists() || LegalCase::query()->exists() || Offense::query()->exists()) {
            throw new RuntimeException('The localhost demo fixture requires an empty domain database.');
        }

        DB::transaction(function (): void {
            $admin = $this->staff('demo_admin', StaffRole::Superuser, 'Andrea', 'Administrator');
            $prosecutor = $this->staff('demo_prosecutor', StaffRole::Prosecutor, 'Paolo', 'Prosecutor');
            $secretary = $this->staff('demo_secretary', StaffRole::Secretary, 'Sofia', 'Secretary');
            $this->staff('demo_process_server', StaffRole::ProcessServer, 'Pio', 'Server');

            app(ManageAssignment::class)->assign(
                $prosecutor,
                $secretary,
                $admin,
                'Local demonstration assignment',
            );

            $qualifiedTheft = app(ManageOffense::class)->create('Qualified Theft', 'Article 310', $admin);
            $estafa = app(ManageOffense::class)->create('Estafa', null, $admin);

            $forFiling = $this->createCase(
                $secretary,
                $qualifiedTheft,
                10,
                'Cabanatuan City Police Station',
                '246810',
                'Camille',
                'Ramon',
            );
            app(DecideSubpoena::class)->approve($forFiling, $prosecutor, 1);
            $resolution = app(SubmitResolution::class)->create($forFiling->refresh(), [
                'verdict' => 'For Filing',
                'court' => 'RTC Cabanatuan',
            ], $secretary);
            app(DecideResolution::class)->approve($resolution, $admin, 1);

            $dismissed = $this->createCase(
                $secretary,
                $estafa,
                11,
                'Gapan City Police Station',
                '135790',
                'Diana',
                'Ernesto',
            );
            app(DecideSubpoena::class)->approve($dismissed, $prosecutor, 1);
            $resolution = app(SubmitResolution::class)->create($dismissed->refresh(), [
                'verdict' => 'Dismissed',
            ], $secretary);
            app(DecideResolution::class)->approve($resolution, $admin, 1);

            $this->createCase(
                $secretary,
                $qualifiedTheft,
                12,
                'Palayan City Police Station',
                '112233',
                'Felisa',
                'Gregorio',
            );

            $deniedSubpoena = $this->createCase(
                $secretary,
                $estafa,
                13,
                'San Jose City Police Station',
                '223344',
                'Helena',
                'Ismael',
            );
            app(DecideSubpoena::class)->deny(
                $deniedSubpoena,
                $prosecutor,
                1,
                'Required case details must be corrected before review.',
            );

            $pendingResolution = $this->createCase(
                $secretary,
                $qualifiedTheft,
                14,
                'Cabanatuan City Police Station',
                '334455',
                'Julia',
                'Leandro',
            );
            app(DecideSubpoena::class)->approve($pendingResolution, $prosecutor, 1);
            app(SubmitResolution::class)->create($pendingResolution->refresh(), [
                'verdict' => 'For Filing',
                'court' => 'MTC Cabanatuan',
            ], $secretary);

            $deniedResolution = $this->createCase(
                $secretary,
                $estafa,
                15,
                'Gapan City Police Station',
                '445566',
                'Maribel',
                'Nestor',
            );
            app(DecideSubpoena::class)->approve($deniedResolution, $prosecutor, 1);
            $resolution = app(SubmitResolution::class)->create($deniedResolution->refresh(), [
                'verdict' => 'Dismissed',
            ], $secretary);
            app(DecideResolution::class)->deny(
                $resolution,
                $admin,
                1,
                'Resolution details require revision before approval.',
            );
        });

        $this->command?->info('Local demo accounts and representative workflow data created.');
    }

    private function staff(string $username, StaffRole $role, string $firstName, string $lastName): User
    {
        $user = User::create([
            'username' => $username,
            'password' => Hash::make(self::PASSWORD),
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

    private function createCase(
        User $secretary,
        Offense $offense,
        int $day,
        string $policeStation,
        string $pin,
        string $complainant,
        string $respondent,
    ): LegalCase {
        $created = app(CreateCase::class)->create([
            'date' => sprintf('2026-07-%02d', $day),
            'hearing_date_1' => sprintf('2026-08-%02d 09:00:00', $day),
            'hearing_date_2' => sprintf('2026-08-%02d 13:30:00', $day),
            'police_station' => $policeStation,
            'offense_ids' => [$offense->id],
            'parties' => [
                $this->party('Complainant', $complainant, 'Demo', 'Female'),
                $this->party('Respondent', $respondent, 'Demo', 'Male'),
            ],
        ], $secretary);

        $case = $created['case'];
        $case->update([
            'pin_hash' => Hash::make($pin),
            'pin_document_secret' => $pin,
        ]);

        return $case;
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
