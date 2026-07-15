import { useId, useMemo, useState, type FocusEvent, type KeyboardEvent } from 'react';
import type { OffenseOption } from './types';

type Props = {
    offenses: OffenseOption[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    error?: string;
};

export default function CrimeAutocomplete({ offenses, selectedIds, onChange, error }: Props) {
    const listboxId = useId();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const selected = useMemo(
        () =>
            selectedIds
                .map((id) => offenses.find((offense) => offense.id === id))
                .filter(Boolean) as OffenseOption[],
        [offenses, selectedIds],
    );
    const suggestions = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase();

        return offenses
            .filter((offense) => !selectedIds.includes(offense.id))
            .filter((offense) => offense.is_selectable)
            .filter((offense) =>
                normalized === ''
                    ? true
                    : `${offense.name} ${offense.law_reference ?? ''}`
                          .toLocaleLowerCase()
                          .includes(normalized),
            )
            .slice(0, 20);
    }, [offenses, query, selectedIds]);

    function select(offense: OffenseOption) {
        if (!selectedIds.includes(offense.id)) {
            onChange([...selectedIds, offense.id]);
        }
        setQuery('');
        setActiveIndex(-1);
        setOpen(true);
    }

    function remove(id: string) {
        onChange(selectedIds.filter((selectedId) => selectedId !== id));
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
        } else if (event.key === 'Enter' && open && suggestions[activeIndex]) {
            event.preventDefault();
            select(suggestions[activeIndex]);
        } else if (event.key === 'Escape') {
            setOpen(false);
        }
    }

    function handleBlur(event: FocusEvent<HTMLDivElement>) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false);
        }
    }

    return (
        <div onBlur={handleBlur}>
            <label htmlFor="crime-search" className="block text-sm font-medium text-slate-700">
                Search Crime
            </label>
            <div className="relative mt-2">
                <input
                    id="crime-search"
                    className="input"
                    value={query}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-activedescendant={
                        open && suggestions[activeIndex]
                            ? `${listboxId}-${suggestions[activeIndex].id}`
                            : undefined
                    }
                    aria-describedby={error ? 'crime-selection-error' : 'crime-selection-help'}
                    autoComplete="off"
                    placeholder="Search the Crime catalog"
                    onFocus={() => {
                        setActiveIndex(-1);
                        setOpen(true);
                    }}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActiveIndex(0);
                        setOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                />
                {open && (
                    <div
                        id={listboxId}
                        role="listbox"
                        aria-label="Crime catalog results"
                        className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-300 bg-white shadow-lg"
                    >
                        {suggestions.map((offense, index) => (
                            <button
                                key={offense.id}
                                id={`${listboxId}-${offense.id}`}
                                type="button"
                                role="option"
                                aria-selected={index === activeIndex}
                                className={`block min-h-11 w-full px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-900 ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => select(offense)}
                            >
                                <span className="font-medium text-slate-900">{offense.name}</span>
                                {offense.law_reference && (
                                    <span className="ml-2 text-slate-600">
                                        {offense.law_reference}
                                    </span>
                                )}
                            </button>
                        ))}
                        {suggestions.length === 0 && (
                            <p className="px-3 py-4 text-sm text-slate-600" role="status">
                                No matching Crime is available.
                            </p>
                        )}
                    </div>
                )}
            </div>

            <p id="crime-selection-help" className="mt-2 text-sm text-slate-600">
                Select one or more entries from the Administrator-managed Crime catalog.
            </p>
            {error && (
                <p id="crime-selection-error" className="mt-2 text-sm text-red-700" role="alert">
                    {error}
                </p>
            )}

            <div className="mt-4" aria-live="polite">
                <p className="text-sm font-medium text-slate-700">
                    Selected Crimes ({selected.length})
                </p>
                {selected.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">No Crime selected.</p>
                ) : (
                    <ul className="mt-2 grid gap-2 md:grid-cols-2">
                        {selected.map((offense) => (
                            <li
                                key={offense.id}
                                className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                                <span className="min-w-0 text-sm">
                                    <span className="font-medium text-slate-900">
                                        {offense.name}
                                    </span>
                                    {offense.law_reference && (
                                        <span className="ml-2 text-slate-600">
                                            {offense.law_reference}
                                        </span>
                                    )}
                                </span>
                                <button
                                    type="button"
                                    className="min-h-11 shrink-0 px-2 text-sm font-semibold text-red-700 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-red-700"
                                    aria-label={`Remove ${offense.name}`}
                                    onClick={() => remove(offense.id)}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
