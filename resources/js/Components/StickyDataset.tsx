import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type Props = {
    controls: ReactNode;
    children: ReactNode;
    className?: string;
    stickyControls?: boolean;
};

type StickyDatasetStyle = CSSProperties & {
    '--lv-sticky-table-offset': string;
};

export default function StickyDataset({
    controls,
    children,
    className = '',
    stickyControls = true,
}: Props) {
    const controlsRef = useRef<HTMLDivElement>(null);
    const [controlsHeight, setControlsHeight] = useState(0);

    useEffect(() => {
        if (!stickyControls) return;

        const element = controlsRef.current;
        if (!element) return;

        const measure = () => {
            const nextHeight = Math.ceil(element.getBoundingClientRect().height);
            setControlsHeight((current) => (current === nextHeight ? current : nextHeight));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);

        return () => observer.disconnect();
    }, [stickyControls]);

    const style = {
        '--lv-sticky-table-offset': `${stickyControls ? controlsHeight + 12 : 12}px`,
    } as StickyDatasetStyle;

    return (
        <div
            className={`sticky-dataset ${className}`}
            style={style}
            data-sticky-controls={stickyControls ? 'true' : 'false'}
        >
            <div ref={controlsRef} className="sticky-dataset-controls">
                {controls}
            </div>
            {children}
        </div>
    );
}
