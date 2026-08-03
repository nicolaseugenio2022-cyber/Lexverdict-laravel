import { useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';

type OffenseOption = {
    id: string;
    name: string;
};

type ReportCaseTypeFilterProps = {
    offenses: OffenseOption[];
    initialSelectedIds: string[];
};

const resultLimit = 20;

function catalogOrderedIds(offenses: OffenseOption[], selectedIds: string[]) {
    const selected = new Set(selectedIds);

    return offenses.filter((offense) => selected.has(offense.id)).map((offense) => offense.id);
}

export default function CaseTypeFilter({
    offenses,
    initialSelectedIds,
}: ReportCaseTypeFilterProps) {
    const inputId = useId();
    const listboxId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedIds, setSelectedIds] = useState(() =>
        catalogOrderedIds(offenses, initialSelectedIds),
    );
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [selectionAnnouncement, setSelectionAnnouncement] = useState('');

    const selected = useMemo(() => {
        const selectedSet = new Set(selectedIds);

        return offenses.filter((offense) => selectedSet.has(offense.id));
    }, [offenses, selectedIds]);

    const matchingOffenses = useMemo(() => {
        const selectedSet = new Set(selectedIds);
        const normalizedQuery = query.trim().toLocaleLowerCase('en');

        return offenses
            .filter((offense) => !selectedSet.has(offense.id))
            .filter((offense) =>
                normalizedQuery === ''
                    ? true
                    : offense.name.toLocaleLowerCase('en').includes(normalizedQuery),
            );
    }, [offenses, query, selectedIds]);

    const suggestions = matchingOffenses.slice(0, resultLimit);
    const activeOffense = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
    const resultAnnouncement = open
        ? matchingOffenses.length === 0
            ? 'No matching Case Type is available.'
            : `${matchingOffenses.length} Case Type result${matchingOffenses.length === 1 ? '' : 's'} available.`
        : '';

    function select(offense: OffenseOption) {
        if (selectedIds.includes(offense.id)) return;

        setSelectedIds((current) => catalogOrderedIds(offenses, [...current, offense.id]));
        setSelectionAnnouncement(`${offense.name} selected.`);
        setQuery('');
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
    }

    function remove(offense: OffenseOption) {
        setSelectedIds((current) => current.filter((id) => id !== offense.id));
        setSelectionAnnouncement(`${offense.name} removed.`);
        inputRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) =>
                suggestions.length === 0 ? -1 : Math.min(current + 1, suggestions.length - 1),
            );
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) =>
                suggestions.length === 0 ? -1 : current <= 0 ? suggestions.length - 1 : current - 1,
            );
        } else if (event.key === 'Home' && open) {
            event.preventDefault();
            setActiveIndex(suggestions.length === 0 ? -1 : 0);
        } else if (event.key === 'End' && open) {
            event.preventDefault();
            setActiveIndex(suggestions.length - 1);
        } else if (event.key === 'Enter' && open) {
            event.preventDefault();
            if (activeOffense) select(activeOffense);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setQuery('');
            setOpen(false);
            setActiveIndex(-1);
        } else if (event.key === 'Tab') {
            setOpen(false);
            setActiveIndex(-1);
        }
    }

    function handleBlur(event: FocusEvent<HTMLDivElement>) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false);
            setActiveIndex(-1);
        }
    }

    return (
        <div className="min-w-0 sm:col-span-2" onBlur={handleBlur}>
            {selected.map((offense) => (
                <input key={offense.id} type="hidden" name="offenses[]" value={offense.id} />
            ))}

            <label htmlFor={inputId} className="field-label">
                Case Type
            </label>
            <div className="relative mt-2">
                <input
                    ref={inputRef}
                    id={inputId}
                    type="search"
                    className="input"
                    value={query}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-activedescendant={
                        open && activeOffense
                            ? `${listboxId}-option-${activeOffense.id}`
                            : undefined
                    }
                    autoComplete="off"
                    placeholder="Search the Case Type catalog"
                    onFocus={() => {
                        setOpen(true);
                        setActiveIndex(-1);
                    }}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                        setActiveIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                />

                {open && (
                    <div
                        id={listboxId}
                        role="listbox"
                        aria-label="Case Type catalog results"
                        aria-multiselectable="true"
                        className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-300 bg-white shadow-lg"
                    >
                        {suggestions.map((offense, index) => (
                            <div
                                key={offense.id}
                                id={`${listboxId}-option-${offense.id}`}
                                role="option"
                                aria-selected={index === activeIndex}
                                className={`flex min-h-11 cursor-pointer items-center px-3 py-2 text-sm text-slate-900 focus:outline-none ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => select(offense)}
                            >
                                <span className="break-words font-medium">{offense.name}</span>
                            </div>
                        ))}

                        {matchingOffenses.length === 0 && (
                            <p className="px-3 py-4 text-sm text-slate-600">
                                No matching Case Type is available.
                            </p>
                        )}

                        {matchingOffenses.length > resultLimit && (
                            <p className="border-t border-slate-200 px-3 py-2 text-sm text-slate-600">
                                Showing the first {resultLimit} results. Refine your search to see
                                more.
                            </p>
                        )}
                    </div>
                )}
            </div>

            <p className="metadata-text mt-2">
                Search and select one or more Case Types from the approved catalog.
            </p>

            <div className="mt-3">
                <p className="text-sm font-medium text-slate-700">
                    Selected Case Types ({selected.length})
                </p>
                {selected.length === 0 ? (
                    <p className="metadata-text mt-2">No Case Type selected.</p>
                ) : (
                    <ul className="mt-2 grid gap-2 md:grid-cols-2">
                        {selected.map((offense) => (
                            <li
                                key={offense.id}
                                className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                                <span className="min-w-0 break-words text-sm font-medium text-slate-900">
                                    {offense.name}
                                </span>
                                <button
                                    type="button"
                                    className="min-h-11 shrink-0 px-2 text-sm font-semibold text-red-700 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-red-700"
                                    aria-label={`Remove ${offense.name}`}
                                    onClick={() => remove(offense)}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {resultAnnouncement}
            </p>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {selectionAnnouncement}
            </p>
        </div>
    );
}
