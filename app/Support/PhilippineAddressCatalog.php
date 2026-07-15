<?php

namespace App\Support;

use JsonException;
use RuntimeException;

final class PhilippineAddressCatalog
{
    private const DATA_FILE = 'data/psgc-2026-04-13.json.gz';

    /** @var array<string, array{code: string, name: string, type: string, parent_code: string}> */
    private array $nodesByCode = [];

    /** @var array<string, list<array{code: string, name: string, type: string, parent_code: string}>> */
    private array $childrenByParent = [];

    private bool $loaded = false;

    /** @return list<array{code: string, name: string}> */
    public function regions(): array
    {
        $this->load();

        return $this->options(array_filter(
            $this->nodesByCode,
            fn (array $node): bool => $node['type'] === 'region',
        ));
    }

    /** @return list<array{code: string, name: string}> */
    public function provinces(string $regionCode): array
    {
        return $this->options(array_filter(
            $this->children($regionCode),
            fn (array $node): bool => in_array($node['type'], ['province', 'special_geographic_area'], true),
        ));
    }

    /** @return list<array{code: string, name: string}> */
    public function municipalities(string $regionCode, ?string $provinceCode): array
    {
        if (! $this->isValidProvince($regionCode, $provinceCode)) {
            return [];
        }

        return $this->options(array_filter(
            $this->children($provinceCode ?: $regionCode),
            fn (array $node): bool => in_array($node['type'], ['city', 'municipality'], true),
        ));
    }

    /** @return list<array{code: string, name: string, label: string}> */
    public function barangays(string $municipalityCode): array
    {
        $municipality = $this->node($municipalityCode);

        if ($municipality === null || ! in_array($municipality['type'], ['city', 'municipality'], true)) {
            return [];
        }

        $options = [];

        foreach ($this->children($municipalityCode) as $child) {
            if ($child['type'] === 'barangay') {
                $options[] = ['code' => $child['code'], 'name' => $child['name'], 'label' => $child['name']];
            }

            if ($child['type'] !== 'submunicipality') {
                continue;
            }

            foreach ($this->children($child['code']) as $barangay) {
                if ($barangay['type'] === 'barangay') {
                    $options[] = [
                        'code' => $barangay['code'],
                        'name' => $barangay['name'],
                        'label' => $barangay['name'].' ('.$child['name'].')',
                    ];
                }
            }
        }

        usort($options, fn (array $left, array $right): int => strnatcasecmp($left['label'], $right['label']));

        return $options;
    }

    public function isRegion(string $regionCode): bool
    {
        return ($this->node($regionCode)['type'] ?? null) === 'region';
    }

    public function isValidProvince(string $regionCode, ?string $provinceCode): bool
    {
        if (! $this->isRegion($regionCode)) {
            return false;
        }

        if ($provinceCode === null || $provinceCode === '') {
            return true;
        }

        $province = $this->node($provinceCode);

        return $province !== null
            && $province['parent_code'] === $regionCode
            && in_array($province['type'], ['province', 'special_geographic_area'], true);
    }

    public function isValidMunicipality(string $regionCode, ?string $provinceCode, string $municipalityCode): bool
    {
        if (! $this->isValidProvince($regionCode, $provinceCode)) {
            return false;
        }

        $municipality = $this->node($municipalityCode);

        return $municipality !== null
            && $municipality['parent_code'] === ($provinceCode ?: $regionCode)
            && in_array($municipality['type'], ['city', 'municipality'], true);
    }

    /**
     * @return array{region: string, province: string, municipality: string, barangay: string}|null
     */
    public function canonicalAddress(
        string $regionCode,
        ?string $provinceCode,
        string $municipalityCode,
        string $barangayCode,
    ): ?array {
        if (! $this->isValidMunicipality($regionCode, $provinceCode, $municipalityCode)) {
            return null;
        }

        $region = $this->node($regionCode);
        $province = $provinceCode ? $this->node($provinceCode) : null;
        $municipality = $this->node($municipalityCode);
        $barangay = $this->node($barangayCode);

        if ($region === null || $municipality === null || $barangay === null) {
            return null;
        }

        $barangayParent = $this->node($barangay['parent_code']);
        $belongsToMunicipality = $barangay['type'] === 'barangay'
            && ($barangay['parent_code'] === $municipalityCode
                || ($barangayParent !== null
                    && $barangayParent['type'] === 'submunicipality'
                    && $barangayParent['parent_code'] === $municipalityCode));

        if (! $belongsToMunicipality) {
            return null;
        }

        return [
            'region' => $region['name'],
            'province' => $province['name'] ?? '',
            'municipality' => $municipality['name'],
            'barangay' => $barangay['name'],
        ];
    }

    /**
     * @return array{region_code: string, province_code: string, municipality_code: string, barangay_code: string}|null
     */
    public function selectionForNames(
        string $regionName,
        string $provinceName,
        string $municipalityName,
        string $barangayName,
    ): ?array {
        $region = $this->findByName($this->regionNodes(), $regionName);

        if ($region === null) {
            return null;
        }

        $province = trim($provinceName) === ''
            ? null
            : $this->findByName($this->provinceNodes($region['code']), $provinceName);

        if (trim($provinceName) !== '' && $province === null) {
            return null;
        }

        $municipality = $this->findByName(
            $this->municipalityNodes($region['code'], $province['code'] ?? null),
            $municipalityName,
        );

        if ($municipality === null) {
            return null;
        }

        $barangay = collect($this->barangays($municipality['code']))
            ->first(fn (array $option): bool => $this->sameName($option['name'], $barangayName));

        if (! is_array($barangay)) {
            return null;
        }

        return [
            'region_code' => $region['code'],
            'province_code' => $province['code'] ?? '',
            'municipality_code' => $municipality['code'],
            'barangay_code' => $barangay['code'],
        ];
    }

    /** @return list<array{code: string, name: string, type: string, parent_code: string}> */
    private function regionNodes(): array
    {
        $this->load();

        return array_values(array_filter(
            $this->nodesByCode,
            fn (array $node): bool => $node['type'] === 'region',
        ));
    }

    /** @return list<array{code: string, name: string, type: string, parent_code: string}> */
    private function provinceNodes(string $regionCode): array
    {
        return array_values(array_filter(
            $this->children($regionCode),
            fn (array $node): bool => in_array($node['type'], ['province', 'special_geographic_area'], true),
        ));
    }

    /** @return list<array{code: string, name: string, type: string, parent_code: string}> */
    private function municipalityNodes(string $regionCode, ?string $provinceCode): array
    {
        if (! $this->isValidProvince($regionCode, $provinceCode)) {
            return [];
        }

        return array_values(array_filter(
            $this->children($provinceCode ?: $regionCode),
            fn (array $node): bool => in_array($node['type'], ['city', 'municipality'], true),
        ));
    }

    /**
     * @param  iterable<array{code: string, name: string, type: string, parent_code: string}>  $nodes
     * @return list<array{code: string, name: string}>
     */
    private function options(iterable $nodes): array
    {
        $options = [];

        foreach ($nodes as $node) {
            $options[] = ['code' => $node['code'], 'name' => $node['name']];
        }

        usort($options, fn (array $left, array $right): int => strnatcasecmp($left['name'], $right['name']));

        return $options;
    }

    /**
     * @param  iterable<array{code: string, name: string, type: string, parent_code: string}>  $nodes
     * @return array{code: string, name: string, type: string, parent_code: string}|null
     */
    private function findByName(iterable $nodes, string $name): ?array
    {
        foreach ($nodes as $node) {
            if ($this->sameName($node['name'], $name)) {
                return $node;
            }
        }

        return null;
    }

    private function sameName(string $left, string $right): bool
    {
        return mb_strtolower(trim($left)) === mb_strtolower(trim($right));
    }

    /** @return array{code: string, name: string, type: string, parent_code: string}|null */
    private function node(string $code): ?array
    {
        $this->load();

        return $this->nodesByCode[$code] ?? null;
    }

    /** @return list<array{code: string, name: string, type: string, parent_code: string}> */
    private function children(string $parentCode): array
    {
        $this->load();

        return $this->childrenByParent[$parentCode] ?? [];
    }

    private function load(): void
    {
        if ($this->loaded) {
            return;
        }

        $compressed = file_get_contents(resource_path(self::DATA_FILE));
        $json = $compressed === false ? false : gzdecode($compressed);

        if ($json === false) {
            throw new RuntimeException('The local PSGC address reference could not be loaded.');
        }

        try {
            /** @var mixed $decoded */
            $decoded = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('The local PSGC address reference is invalid.', previous: $exception);
        }

        if (! is_array($decoded)) {
            throw new RuntimeException('The local PSGC address reference is invalid.');
        }

        foreach ($decoded as $record) {
            if (! is_array($record)) {
                continue;
            }

            $code = (string) ($record['psgc_id'] ?? '');
            $name = (string) ($record['name'] ?? '');
            $type = (string) ($record['type'] ?? '');
            $parentCode = (string) ($record['parent_psgc_id'] ?? '');

            if ($code === '' || $name === '' || $type === '' || $parentCode === '') {
                continue;
            }

            $node = ['code' => $code, 'name' => $name, 'type' => $type, 'parent_code' => $parentCode];
            $this->nodesByCode[$code] = $node;
            $this->childrenByParent[$parentCode][] = $node;
        }

        $this->loaded = true;
    }
}
