import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { AddressOption, CasePartyForm } from './types';

type Props = {
    index: number;
    party: CasePartyForm;
    regions: AddressOption[];
    errors: Partial<Record<string, string>>;
    onChange: (party: CasePartyForm) => void;
};

type BarangayOption = AddressOption & { label?: string };

export default function CascadingAddressFields({ index, party, regions, errors, onChange }: Props) {
    const [provinces, setProvinces] = useState<AddressOption[]>([]);
    const [municipalities, setMunicipalities] = useState<AddressOption[]>([]);
    const [barangays, setBarangays] = useState<BarangayOption[]>([]);
    const [loading, setLoading] = useState({
        provinces: false,
        municipalities: false,
        barangays: false,
    });
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!party.region_code) {
            return;
        }

        return loadOptions(
            'provinces',
            { region_code: party.region_code },
            setProvinces,
            setLoading,
            setLoadError,
        );
    }, [party.region_code]);

    useEffect(() => {
        if (!party.region_code) {
            return;
        }

        return loadOptions(
            'municipalities',
            { region_code: party.region_code, province_code: party.province_code },
            setMunicipalities,
            setLoading,
            setLoadError,
        );
    }, [party.province_code, party.region_code]);

    useEffect(() => {
        if (!party.municipality_code) {
            return;
        }

        return loadOptions(
            'barangays',
            { municipality_code: party.municipality_code },
            setBarangays,
            setLoading,
            setLoadError,
        );
    }, [party.municipality_code]);

    function update(fields: Partial<CasePartyForm>) {
        onChange({ ...party, ...fields });
    }

    return (
        <>
            {party.source_party_id && !party.region_code && party.region && (
                <p
                    className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 md:col-span-3"
                    role="status"
                >
                    Current address:{' '}
                    {[
                        party.street,
                        party.barangay,
                        party.municipality,
                        party.province,
                        party.region,
                    ]
                        .filter(Boolean)
                        .join(', ')}
                    . Select a Region only when updating this address.
                </p>
            )}
            <AddressField
                label="Region"
                error={errors[`parties.${index}.region_code`] ?? errors[`parties.${index}.region`]}
            >
                <select
                    className="input"
                    value={party.region_code}
                    onChange={(event) => {
                        const option = regions.find((region) => region.code === event.target.value);
                        setProvinces([]);
                        setMunicipalities([]);
                        setBarangays([]);
                        update({
                            region_code: option?.code ?? '',
                            region: option?.name ?? '',
                            province_code: '',
                            province: '',
                            municipality_code: '',
                            municipality: '',
                            barangay_code: '',
                            barangay: '',
                        });
                    }}
                >
                    <option value="">Select Region</option>
                    {regions.map((region) => (
                        <option key={region.code} value={region.code}>
                            {region.name}
                        </option>
                    ))}
                </select>
            </AddressField>

            <AddressField
                label="Province"
                error={
                    errors[`parties.${index}.province_code`] ?? errors[`parties.${index}.province`]
                }
                loading={loading.provinces}
            >
                <select
                    className="input"
                    value={party.province_code}
                    disabled={!party.region_code || loading.provinces}
                    onChange={(event) => {
                        const option = provinces.find(
                            (province) => province.code === event.target.value,
                        );
                        setMunicipalities([]);
                        setBarangays([]);
                        update({
                            province_code: option?.code ?? '',
                            province: option?.name ?? '',
                            municipality_code: '',
                            municipality: '',
                            barangay_code: '',
                            barangay: '',
                        });
                    }}
                >
                    <option value="">
                        {provinces.length === 0 && party.region_code
                            ? 'No Province'
                            : 'Select Province or leave blank for independent city'}
                    </option>
                    {provinces.map((province) => (
                        <option key={province.code} value={province.code}>
                            {province.name}
                        </option>
                    ))}
                </select>
            </AddressField>

            <AddressField
                label="Municipality/City"
                error={
                    errors[`parties.${index}.municipality_code`] ??
                    errors[`parties.${index}.municipality`]
                }
                loading={loading.municipalities}
            >
                <select
                    className="input"
                    value={party.municipality_code}
                    disabled={
                        !party.region_code || loading.municipalities || municipalities.length === 0
                    }
                    onChange={(event) => {
                        const option = municipalities.find(
                            (municipality) => municipality.code === event.target.value,
                        );
                        setBarangays([]);
                        update({
                            municipality_code: option?.code ?? '',
                            municipality: option?.name ?? '',
                            barangay_code: '',
                            barangay: '',
                        });
                    }}
                >
                    <option value="">Select Municipality/City</option>
                    {municipalities.map((municipality) => (
                        <option key={municipality.code} value={municipality.code}>
                            {municipality.name}
                        </option>
                    ))}
                </select>
            </AddressField>

            <AddressField
                label="Barangay"
                error={
                    errors[`parties.${index}.barangay_code`] ?? errors[`parties.${index}.barangay`]
                }
                loading={loading.barangays}
            >
                <select
                    className="input"
                    value={party.barangay_code}
                    disabled={!party.municipality_code || loading.barangays}
                    onChange={(event) => {
                        const option = barangays.find(
                            (barangay) => barangay.code === event.target.value,
                        );
                        update({ barangay_code: option?.code ?? '', barangay: option?.name ?? '' });
                    }}
                >
                    <option value="">Select Barangay</option>
                    {barangays.map((barangay) => (
                        <option key={barangay.code} value={barangay.code}>
                            {barangay.label ?? barangay.name}
                        </option>
                    ))}
                </select>
            </AddressField>

            <AddressField label="Street" error={errors[`parties.${index}.street`]}>
                <input
                    className="input"
                    value={party.street}
                    autoComplete="street-address"
                    onChange={(event) => update({ street: event.target.value })}
                />
            </AddressField>

            {loadError && (
                <p className="md:col-span-3 text-sm text-red-700" role="alert">
                    {loadError}
                </p>
            )}
        </>
    );
}

function AddressField({
    label,
    error,
    loading,
    children,
}: {
    label: string;
    error?: string;
    loading?: boolean;
    children: ReactNode;
}) {
    return (
        <label className="block text-sm font-medium text-slate-700">
            <span className="flex items-center justify-between gap-2">
                {label}
                {loading && (
                    <span className="text-xs font-normal text-slate-600" role="status">
                        Loading...
                    </span>
                )}
            </span>
            <span className="mt-2 block">{children}</span>
            {error && (
                <span className="mt-2 block text-sm text-red-700" role="alert">
                    {error}
                </span>
            )}
        </label>
    );
}

function loadOptions<T extends AddressOption>(
    level: 'provinces' | 'municipalities' | 'barangays',
    parameters: Record<string, string>,
    setOptions: (options: T[]) => void,
    setLoading: Dispatch<
        SetStateAction<{ provinces: boolean; municipalities: boolean; barangays: boolean }>
    >,
    setError: (error: string | null) => void,
) {
    const controller = new AbortController();
    const query = new URLSearchParams({ level, ...parameters });

    setLoading((current) => ({ ...current, [level]: true }));
    setError(null);

    fetch(`/case-entry/address-options?${query.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    })
        .then(async (response) => {
            if (!response.ok) throw new Error('Address options could not be loaded. Try again.');
            return (await response.json()) as { options: T[] };
        })
        .then((response) => setOptions(response.options))
        .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setOptions([]);
            setError(
                error instanceof Error
                    ? error.message
                    : 'Address options could not be loaded. Try again.',
            );
        })
        .finally(() => {
            if (!controller.signal.aborted) {
                setLoading((current) => ({ ...current, [level]: false }));
            }
        });

    return () => controller.abort();
}
