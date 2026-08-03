import { useEffect, useId, useRef } from 'react';

type Props = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    busy?: boolean;
    destructive?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export default function ConfirmationDialog({
    open,
    title,
    description,
    confirmLabel,
    busy = false,
    destructive = false,
    onCancel,
    onConfirm,
}: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            openerRef.current = document.activeElement as HTMLElement | null;
            dialog.showModal();
            window.requestAnimationFrame(() => cancelRef.current?.focus());
            return;
        }

        if (!open && dialog.open) {
            dialog.close();
            openerRef.current?.focus();
        }
    }, [open]);

    useEffect(
        () => () => {
            openerRef.current?.focus();
        },
        [],
    );

    return (
        <dialog
            ref={dialogRef}
            className="confirmation-dialog"
            role="alertdialog"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onCancel={(event) => {
                event.preventDefault();
                if (!busy) onCancel();
            }}
        >
            <div className="confirmation-dialog-body">
                <h2 id={titleId} className="section-title">
                    {title}
                </h2>
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-700">
                    {description}
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                        ref={cancelRef}
                        type="button"
                        className="btn btn-secondary"
                        onClick={onCancel}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={destructive ? 'btn btn-danger-outline' : 'btn btn-primary'}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? 'Processing' : confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
