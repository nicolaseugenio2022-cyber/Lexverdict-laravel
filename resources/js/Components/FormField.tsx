import type { ReactNode } from 'react';

export type FieldControlProps = {
    id: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
};

type FormFieldProps = {
    id: string;
    label: string;
    error?: string;
    children: (props: FieldControlProps) => ReactNode;
};

export default function FormField({ id, label, error, children }: FormFieldProps) {
    const errorId = `${id}-error`;
    const controlProps: FieldControlProps = {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
    };

    return (
        <div>
            <label className="field-label block" htmlFor={id}>
                {label}
            </label>
            <div className="mt-2">{children(controlProps)}</div>
            {error && (
                <p id={errorId} className="field-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
