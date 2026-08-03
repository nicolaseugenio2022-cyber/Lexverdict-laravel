import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { ToastContext, type ToastApi, type ToastVariant } from './toast';

type Toast = {
    id: number;
    variant: ToastVariant;
    message: string;
};

let nextToastId = 1;

export default function ToastProvider({ children }: PropsWithChildren) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const show = useCallback((variant: ToastVariant, message: string) => {
        const normalizedMessage = message.trim();
        if (!normalizedMessage) return;

        setToasts((current) => {
            if (
                current.some(
                    (toast) => toast.variant === variant && toast.message === normalizedMessage,
                )
            ) {
                return current;
            }

            return [...current, { id: nextToastId++, variant, message: normalizedMessage }].slice(
                -3,
            );
        });
    }, []);

    const api = useMemo<ToastApi>(
        () => ({
            show,
            success: (message) => show('success', message),
            error: (message) => show('error', message),
            warning: (message) => show('warning', message),
            info: (message) => show('info', message),
        }),
        [show],
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            {toasts.length > 0 && (
                <section className="toast-region" aria-label="Notifications">
                    {toasts.map((toast) => (
                        <ToastMessage key={toast.id} toast={toast} onDismiss={dismiss} />
                    ))}
                </section>
            )}
        </ToastContext.Provider>
    );
}

function ToastMessage({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
    useEffect(() => {
        if (toast.variant === 'error' || toast.variant === 'warning') return;

        const timeout = window.setTimeout(() => onDismiss(toast.id), 6000);
        return () => window.clearTimeout(timeout);
    }, [onDismiss, toast.id, toast.variant]);

    return (
        <article
            className={`toast toast-${toast.variant}`}
            role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
            aria-atomic="true"
        >
            <div className="min-w-0">
                <p className="toast-label">{toastLabel(toast.variant)}</p>
                <p className="toast-message">{toast.message}</p>
            </div>
            <button
                type="button"
                className="toast-dismiss"
                onClick={() => onDismiss(toast.id)}
                aria-label={`Dismiss ${toastLabel(toast.variant).toLowerCase()} notification`}
            >
                Dismiss
            </button>
        </article>
    );
}

function toastLabel(variant: ToastVariant) {
    return {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information',
    }[variant];
}
