type Props = {
    title: string;
    description?: string;
};

export default function EmptyState({ title, description }: Props) {
    return (
        <div className="px-5 py-10 text-center">
            <p className="font-semibold text-slate-800">{title}</p>
            {description && (
                <p className="mx-auto mt-1 max-w-xl text-sm text-slate-600">{description}</p>
            )}
        </div>
    );
}
