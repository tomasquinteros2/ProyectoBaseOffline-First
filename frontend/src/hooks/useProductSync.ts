import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useProductSync() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const eventSource = new EventSource('/api/producto/sync/events');

        eventSource.addEventListener('product-update', () => {
            void queryClient.invalidateQueries({ queryKey: ['products'] });
        });

        eventSource.addEventListener('error', (error) => {
            console.error('SSE Error:', error);
            eventSource.close();
        });

        return () => {
            eventSource.close();
        };
    }, [queryClient]);
}

