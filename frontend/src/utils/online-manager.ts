import { onlineManager } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

export function setupOnlineManager(queryClient: QueryClient) {
    onlineManager.setEventListener(setOnline => {
        const handleOnline = () => {
            setOnline(true);
            void queryClient.invalidateQueries();
            void queryClient.refetchQueries({ type: 'active' });
        };

        const handleOffline = () => {
            setOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    });
}
