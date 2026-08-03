import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef } from 'react';

const defaultMessage = 'You have unsaved changes. Leave this page and discard them?';

export default function useUnsavedChanges(enabled: boolean, message: string = defaultMessage) {
    const bypassNextVisit = useRef(false);

    useEffect(() => {
        const removeBeforeListener = router.on('before', () => {
            if (bypassNextVisit.current) {
                bypassNextVisit.current = false;
                return;
            }

            if (enabled && !window.confirm(message)) return false;
        });

        function beforeUnload(event: BeforeUnloadEvent) {
            if (!enabled) return;
            event.preventDefault();
            event.returnValue = '';
        }

        window.addEventListener('beforeunload', beforeUnload);
        return () => {
            removeBeforeListener();
            window.removeEventListener('beforeunload', beforeUnload);
        };
    }, [enabled, message]);

    const allowNextVisit = useCallback(() => {
        bypassNextVisit.current = true;
    }, []);

    const confirmDiscard = useCallback(
        () => !enabled || window.confirm(message),
        [enabled, message],
    );

    return { allowNextVisit, confirmDiscard };
}
