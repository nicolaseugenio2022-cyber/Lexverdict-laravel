<?php

namespace Database\Seeders;

use App\Models\Offense;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Ramsey\Uuid\Uuid;
use RuntimeException;

class PhilippineRevisedPenalCodeSeeder extends Seeder
{
    public function run(): void
    {
        /** @var list<array{canonical_key: string, name: string, law_reference: string, source_url: string, source_note: string, legacy_aliases: list<string>}> $entries */
        $entries = require database_path('data/philippine_revised_penal_code.php');

        $summary = DB::transaction(function () use ($entries): array {
            $summary = ['inserted' => 0, 'adopted' => 0, 'updated' => 0, 'unresolved' => 0];

            foreach ($entries as $entry) {
                $normalizedName = $this->normalizeName($entry['name']);
                $recognizedNames = collect([$entry['name'], ...$entry['legacy_aliases']])
                    ->map(fn (string $name): string => $this->normalizeName($name))
                    ->unique()
                    ->values();
                $offense = Offense::query()->where('canonical_key', $entry['canonical_key'])->first();

                if ($offense === null) {
                    $matches = Offense::query()->whereIn('normalized_name', $recognizedNames)->get();

                    if ($matches->count() > 1) {
                        throw new RuntimeException("Crime catalog has multiple recognized matches for {$entry['name']}.");
                    }

                    $offense = $matches->first();
                }

                if ($offense !== null) {
                    if ($offense->canonical_key !== null && $offense->canonical_key !== $entry['canonical_key']) {
                        throw new RuntimeException("Crime catalog conflict for {$entry['name']}.");
                    }

                    $adopted = $offense->canonical_key === null;
                    $offense->update([
                        'canonical_key' => $entry['canonical_key'],
                        'law_reference' => $offense->law_reference ?: $entry['law_reference'],
                        'source_url' => $entry['source_url'],
                        'source_note' => $entry['source_note'],
                        'is_active' => true,
                    ]);
                    $summary[$adopted ? 'adopted' : 'updated']++;

                    continue;
                }

                $uncertainMatch = $this->uncertainMatch($recognizedNames->all());

                if ($uncertainMatch !== null) {
                    $summary['unresolved']++;

                    throw new RuntimeException(
                        "Unresolved Crime catalog match for {$entry['name']}: {$uncertainMatch->name}.",
                    );
                }

                Offense::query()->create([
                    'id' => Uuid::uuid5(Uuid::NAMESPACE_URL, 'lexverdict:'.$entry['canonical_key'])->toString(),
                    'canonical_key' => $entry['canonical_key'],
                    'name' => $entry['name'],
                    'normalized_name' => $normalizedName,
                    'law_reference' => $entry['law_reference'],
                    'source_url' => $entry['source_url'],
                    'source_note' => $entry['source_note'],
                    'is_active' => true,
                ]);
                $summary['inserted']++;
            }

            return $summary;
        });

        $this->command?->info(sprintf(
            'RPC Crime catalog: %d inserted, %d adopted, %d updated, %d unresolved.',
            $summary['inserted'],
            $summary['adopted'],
            $summary['updated'],
            $summary['unresolved'],
        ));
    }

    /** @param list<string> $recognizedNames */
    private function uncertainMatch(array $recognizedNames): ?Offense
    {
        return Offense::query()
            ->whereNull('canonical_key')
            ->get()
            ->first(function (Offense $offense) use ($recognizedNames): bool {
                return collect($recognizedNames)->contains(function (string $recognizedName) use ($offense): bool {
                    $candidate = $offense->normalized_name;
                    $shorterLength = min(mb_strlen($candidate), mb_strlen($recognizedName));

                    if ($shorterLength < 8) {
                        return false;
                    }

                    if (str_contains($candidate, $recognizedName) || str_contains($recognizedName, $candidate)) {
                        return true;
                    }

                    similar_text($candidate, $recognizedName, $percentage);

                    return $percentage >= 85;
                });
            });
    }

    private function normalizeName(string $name): string
    {
        return Str::of($name)->trim()->replaceMatches('/\s+/', ' ')->lower()->toString();
    }
}
